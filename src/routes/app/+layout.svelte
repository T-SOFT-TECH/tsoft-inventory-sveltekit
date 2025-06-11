<script>
  /** @type {import('./$types').LayoutData} */
  export let data; // Receives data from +layout.server.js (user, session)

  // $: user = data.user; // If you need reactive access to user
</script>

<div class="app-layout">
  <header class="app-header">
    <nav class="app-nav">
      <ul>
        <li><a href="/app/dashboard">Dashboard</a></li>
        {#if data.user}
          <li><span>User: {data.user.email}</span></li>
        {/if}
        {#if data.isAdmin}
          <li><a href="/app/admin/categories" class="admin-link">Admin Settings</a></li>
        {/if}
        <li><a href="/">Public Home</a></li>
        <!-- Add other app-wide links here -->
      </ul>
    </nav>
  </header>

  <main class="app-content">
    <slot /> <!-- Child pages like dashboard will be rendered here -->
  </main>

  <footer>
    <!-- App-specific footer -->
  </footer>
</div>

<style>
  .app-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  .app-header {
    background-color: #f0f0f0;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid #ddd;
  }
  .app-nav ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .app-nav a {
    text-decoration: none;
    color: #333;
  }
  .app-nav a:hover {
    color: #007bff;
  }
  .admin-link {
    font-weight: bold;
    color: #d9534f; /* Example admin link color */
  }
  .admin-link:hover {
    color: #c9302c;
  }
  .app-content {
    flex-grow: 1;
    padding: 1rem; /* Example padding */
  }
  footer {
    background-color: #333;
    color: white;
    padding: 1rem;
    text-align: center;
  }
</style>
