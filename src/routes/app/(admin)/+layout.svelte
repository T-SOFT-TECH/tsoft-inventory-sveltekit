<script>
  /** @type {import('./$types').LayoutData} */
  export let data; // Receives data from the +layout.server.js (e.g., user)
</script>

<div class="admin-section-layout">
  <header class="admin-header">
    <h2>Admin Panel</h2>
    {#if data.user}
      <span>Logged in as Admin: {data.user.email}</span>
    {/if}
  </header>
  <hr />

  <nav class="admin-nav">
    <ul>
      <li><a href="/app/admin/categories">Manage Categories</a></li>
      <!-- Add other admin links here as needed -->
      <li><a href="/app/dashboard">App Dashboard (User)</a></li>
    </ul>
  </nav>

  <main class="admin-content">
    <slot><!-- Admin pages will be rendered here --></slot>
  </main>
  <footer class="admin-footer">
    <p>Admin section footer</p>
  </footer>
</div>

<style>
  .admin-section-layout {
    border: 2px dashed blue;
    padding: 1rem;
    margin: 1rem 0;
  }
  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
  }
  .admin-nav {
    padding: 0.5rem 0;
    margin-bottom: 1rem;
    border-bottom: 1px solid #eee;
  }
  .admin-nav ul {
    list-style-type: none;
    padding: 0;
    display: flex;
    gap: 1rem;
  }
  .admin-nav a {
    text-decoration: none;
    color: #007bff; /* Example link color */
  }
  .admin-nav a:hover {
    text-decoration: underline;
  }
  .admin-content {
    padding: 1rem 0;
  }
  .admin-footer {
    border-top: 1px solid #eee;
    padding-top: 0.5rem;
    margin-top: 1rem;
    font-size: 0.9em;
    color: #555;
  }
</style>
