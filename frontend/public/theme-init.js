try {
  var t = localStorage.getItem("interviewiq_theme");
  if (t === "light") {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  } else {
    document.documentElement.classList.add("dark");
  }
} catch (e) {}
