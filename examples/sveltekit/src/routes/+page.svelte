<script lang="ts">
  import { enhance } from '$app/forms'
  import type { PageData } from "./$types"

  let { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>Posts - SvelteKit + Vla Example</title>
</svelte:head>

<small class="example-label">SvelteKit Example</small>
<h1>Posts</h1>

<form method="POST" action="?/create" use:enhance>
  <textarea name="content" placeholder="What's on your mind?" required></textarea>
  <br />
  <button type="submit">Submit</button>
  •
  <small>Post as: {data.user ? data.user.name : "(new user)"}</small>
</form>

<hr />

{#if data.posts.length === 0}
  <h2 class="no-posts">No posts yet</h2>
{:else}
  <div>
    {#each data.posts as post}
      <article>
        <small>From {post.from.name}</small>
        <p>{post.content}</p>
        <small>
          {new Date(post.createdAt).toISOString()} • ID: {post.id}
        </small>
      </article>
    {/each}
  </div>
{/if}

<style>
  :global(body) {
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    line-height: 1.6;
  }
  :global(h1) {
    color: #333;
  }
  form {
    margin-bottom: 20px;
    padding: 20px;
    background: #f5f5f5;
    border-radius: 8px;
  }
  textarea {
    width: 100%;
    min-height: 80px;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
    box-sizing: border-box;
  }
  button {
    margin-top: 10px;
    padding: 10px 20px;
    background: #0070f3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  button:hover {
    background: #0051cc;
  }
  :global(hr) {
    margin: 20px 0;
    border: none;
    border-top: 1px solid #eee;
  }
  article {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #eee;
  }
  article:last-child {
    border-bottom: none;
  }
  small {
    color: #666;
    font-size: 12px;
  }
  :global(p) {
    margin: 10px 0;
    color: #333;
  }
  .no-posts {
    text-align: center;
    color: #999;
    padding: 40px 0;
  }
  .example-label {
    display: block;
    margin-bottom: 5px;
    color: #999;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
  }
</style>
