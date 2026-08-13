const Captcha = () => <altcha-widget challenge="/auth/altcha/challenge"></altcha-widget>;

export const Login = () => (
  <main class="container mx-auto max-w-md p-8">
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h1 class="card-title">Sign in</h1>
        <form hx-post="/auth/login" hx-target="#auth-result" hx-swap="innerHTML">
          <label class="form-control mb-4">
            <span class="label-text">Email, username, or phone</span>
            <input class="input input-bordered" name="identifier" required />
          </label>
          <label class="form-control mb-4">
            <span class="label-text">Password</span>
            <input class="input input-bordered" name="password" type="password" required />
          </label>
          <div class="mb-4"><Captcha /></div>
          <button class="btn btn-primary w-full" type="submit">Sign in</button>
          <div id="auth-result" class="mt-4"></div>
        </form>
        <a class="link link-primary mt-4" href="/auth/register">Create an account</a>
        <a class="link mt-2 block" href="/">Back home</a>
      </div>
    </div>
  </main>
);

export const Register = () => (
  <main class="container mx-auto max-w-md p-8">
    <div class="card bg-base-100 shadow-xl"><div class="card-body">
      <h1 class="card-title">Create an account</h1>
      <form hx-post="/auth/register" hx-target="#auth-result" hx-swap="innerHTML">
        <input class="input input-bordered mb-3 w-full" name="username" placeholder="Username" required />
        <input class="input input-bordered mb-3 w-full" name="email" type="email" placeholder="Email" required />
        <input class="input input-bordered mb-3 w-full" name="phone" placeholder="Phone" required />
        <input class="input input-bordered mb-3 w-full" name="first_name" placeholder="First name" required />
        <input class="input input-bordered mb-3 w-full" name="last_name" placeholder="Last name" required />
        <input class="input input-bordered mb-3 w-full" name="password" type="password" placeholder="Password" required />
        <div class="mb-4"><Captcha /></div>
        <button class="btn btn-primary w-full" type="submit">Register</button>
        <div id="auth-result" class="mt-4"></div>
      </form>
      <a class="link link-primary mt-4" href="/auth">Back to sign in</a>
    </div></div>
  </main>
);
