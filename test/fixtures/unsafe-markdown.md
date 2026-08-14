Safe **emphasis**, a [website](https://example.com), and a table remain readable.

| State | Result |
| ----- | ------ |
| Safe  | Kept   |

<script>globalThis.compromised = true</script>
<img src="https://tracker.example/pixel.gif" onerror="globalThis.compromised = true">
<iframe src="https://tracker.example/frame"></iframe>
<a href="javascript:alert('unsafe')" onclick="alert('unsafe')">Unsafe link</a>
[Unsafe Markdown link](data:text/html,unsafe)
![Remote Markdown image](https://tracker.example/image.png)
