<script>
  /** @type {import('./$types').ActionData} */
  export let form;
</script>

<h1>Login</h1>

<form method="POST" action="?/login">
  <div>
    <label for="email">Email</label>
    <input id="email" name="email" type="email" value={form?.email ?? ''} required />
  </div>

  <div>
    <label for="password">Password</label>
    <input id="password" name="password" type="password" required />
  </div>

  {#if form?.message}
    <p style="color: red;">{form.message}</p>
  {/if}
  {#if form?.error}
    <p style="color: red;">{form.error}</p>
  {/if}
  {#if form?.missing}
    <p style="color: red;">Email and password are required.</p>
  {/if}
  {#if form?.incorrect}
    <p style="color: red;">Invalid email or password.</p>
  {/if}

  <button type="submit">Log in</button>
</form>
