import { Socket } from "node:net";
import { logger } from "../logger";

export interface FtpConfig {
  host: string;
  port?: number;
  user: string;
  password?: string;
  remoteDir?: string;
  retentionCount?: number;
}

export class SimpleFtpClient {
  private config: FtpConfig;

  constructor(config: FtpConfig) {
    this.config = {
      port: 21,
      remoteDir: "/backups",
      retentionCount: 3,
      ...config,
    };
  }

  private sendCommand(socket: Socket, cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const onData = (data: Buffer) => {
        const res = data.toString();
        socket.removeListener("data", onData);
        resolve(res);
      };
      const onError = (err: Error) => {
        socket.removeListener("error", onError);
        reject(err);
      };
      socket.on("data", onData);
      socket.on("error", onError);
      socket.write(`${cmd}\r\n`);
    });
  }

  private readResponse(socket: Socket): Promise<string> {
    return new Promise((resolve, reject) => {
      const onData = (data: Buffer) => {
        socket.removeListener("data", onData);
        resolve(data.toString());
      };
      const onError = (err: Error) => {
        socket.removeListener("error", onError);
        reject(err);
      };
      socket.on("data", onData);
      socket.on("error", onError);
    });
  }

  private async getPassiveDataConnection(controlSocket: Socket): Promise<{ ip: string; port: number }> {
    const res = await this.sendCommand(controlSocket, "PASV");
    const match = res.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
    if (!match) {
      throw new Error(`PASV response unparsable: ${res}`);
    }
    const ip = `${match[1]}.${match[2]}.${match[3]}.${match[4]}`;
    const port = parseInt(match[5], 10) * 256 + parseInt(match[6], 10);
    return { ip, port };
  }

  public async connect(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      socket.connect(this.config.port ?? 21, this.config.host, async () => {
        try {
          await this.readResponse(socket); // 220 greeting
          await this.sendCommand(socket, `USER ${this.config.user}`);
          if (this.config.password) {
            await this.sendCommand(socket, `PASS ${this.config.password}`);
          }
          await this.sendCommand(socket, "TYPE I"); // Binary mode
          resolve(socket);
        } catch (err) {
          socket.destroy();
          reject(err);
        }
      });
      socket.on("error", reject);
    });
  }

  public async listFiles(socket: Socket, dir: string): Promise<string[]> {
    try {
      await this.sendCommand(socket, `CWD ${dir}`);
    } catch {
      await this.sendCommand(socket, `MKD ${dir}`);
      await this.sendCommand(socket, `CWD ${dir}`);
    }

    const { ip, port } = await this.getPassiveDataConnection(socket);
    const dataSocket = new Socket();

    return new Promise((resolve, reject) => {
      let buffer = "";
      dataSocket.connect(port, ip, async () => {
        try {
          await this.sendCommand(socket, "NLST");
        } catch (err) {
          reject(err);
        }
      });

      dataSocket.on("data", (d) => {
        buffer += d.toString();
      });

      dataSocket.on("end", async () => {
        await this.readResponse(socket); // 226 Transfer complete
        const files = buffer
          .split(/\r?\n/)
          .map((f) => f.trim())
          .filter((f) => f.length > 0 && f.startsWith("backup-"));
        resolve(files);
      });

      dataSocket.on("error", reject);
    });
  }

  public async deleteFile(socket: Socket, fileName: string): Promise<void> {
    await this.sendCommand(socket, `DELE ${fileName}`);
  }

  public async uploadFile(socket: Socket, fileName: string, fileData: Uint8Array): Promise<void> {
    const { ip, port } = await this.getPassiveDataConnection(socket);
    const dataSocket = new Socket();

    return new Promise((resolve, reject) => {
      dataSocket.connect(port, ip, async () => {
        try {
          await this.sendCommand(socket, `STOR ${fileName}`);
          dataSocket.end(Buffer.from(fileData));
        } catch (err) {
          dataSocket.destroy();
          reject(err);
        }
      });

      dataSocket.on("close", async () => {
        try {
          await this.readResponse(socket); // 226 Transfer complete
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      dataSocket.on("error", reject);
    });
  }

  public async rotateAndUpload(localFilePath: string, fileName: string): Promise<{ deleted: string[]; uploaded: string }> {
    const socket = await this.connect();
    const remoteDir = this.config.remoteDir || "/backups";
    const retention = this.config.retentionCount ?? 3;
    const deleted: string[] = [];

    try {
      const existingFiles = await this.listFiles(socket, remoteDir);
      // Sort ascending so oldest is at start
      existingFiles.sort();

      // If we have >= retention files, remove oldest until we have retention - 1 slots
      while (existingFiles.length >= retention) {
        const oldest = existingFiles.shift()!;
        try {
          await this.deleteFile(socket, oldest);
          deleted.push(oldest);
          logger.app("FTP_BACKUP_ROTATED", { data: { deleted: oldest } });
        } catch (err) {
          logger.app("FTP_BACKUP_DELETE_FAILED", { error: err, data: { file: oldest } });
        }
      }

      const fileData = await Bun.file(localFilePath).bytes();
      await this.uploadFile(socket, fileName, fileData);
      logger.app("FTP_BACKUP_UPLOADED", { data: { file: fileName, sizeBytes: fileData.length } });

      await this.sendCommand(socket, "QUIT");
      socket.destroy();

      return { deleted, uploaded: fileName };
    } catch (err) {
      socket.destroy();
      throw err;
    }
  }
}
