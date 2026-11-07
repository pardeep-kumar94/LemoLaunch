/*
  LemoLaunch badge. Add to your site where the badge should appear:
  <script src="https://<launchpad-site>/embed.js" data-product="your-product" data-theme="light" async></script>
  data-theme is light, yellow or dark.
*/
(function () {
  var script = document.currentScript;
  if (!script || !script.parentNode) return;
  var slug = script.getAttribute("data-product") || "";
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return;
  var theme = script.getAttribute("data-theme");
  if (theme !== "yellow" && theme !== "dark") theme = "light";
  var origin = new URL(script.src).origin;

  var link = document.createElement("a");
  link.href = origin + "/products/" + slug;
  link.target = "_blank";
  link.rel = "noopener";
  link.style.display = "inline-block";
  link.style.lineHeight = "0";

  var img = document.createElement("img");
  img.src = origin + "/badge/" + slug + ".svg?theme=" + theme;
  img.alt = "Launched on LemoLaunch";
  img.width = 250;
  img.height = 56;
  img.style.border = "0";

  link.appendChild(img);
  script.parentNode.insertBefore(link, script);
})();
