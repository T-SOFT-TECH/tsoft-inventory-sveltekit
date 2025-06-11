<script>
  /** @type {import('./$types').ActionData} */
  export let form;
</script>

<h1>Register</h1>

<form method="POST" action="?/register">
  <div>
    <label for="email">Email</label>
    <input id="email" name="email" type="email" value={form?.email ?? ''} required />
  </div>

  <div>
    <label for="password">Password</label>
    <input id="password" name="password" type="password" required />
  </div>

  <div>
    <label for="password_confirm">Confirm Password</label>
    <input id="password_confirm" name="password_confirm" type="password" required />
  </div>

  {#if form?.message}
    <p style="color: red;">{form.message}</p>
  {/if}
  {#if form?.error}
    <p style="color: red;">{form.error}</p>
  {/if}

  <button type="submit">Register</button>
</form>
