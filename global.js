function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"
  : "/portfolio/";

let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'resume/', title: 'Resume' },
    { url: 'contact/', title: 'Contact' },
    { url: 'meta/', title: 'Meta' },
    { url: 'https://github.com/karizabal', title: 'Github' },
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    url = !url.startsWith('http') ? BASE_PATH + url : url;
    let title = p.title;
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add("current");
    }
    if (a.host !== location.host) {
        a.target = "_blank";
    }
    nav.append(a);
}

document.body.insertAdjacentHTML(
    'afterbegin',
    `
      <label class="color-scheme">
          Theme:
          <select>
              <option>Automatic</option>
              <option>Dark</option>
              <option>Light</option>
          </select>
      </label>`,
);

let select = document.querySelector("label select");

function setColorScheme(scheme) {
    document.documentElement.style.setProperty("color-scheme", scheme);
}

if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
    select.value = localStorage.colorScheme;
}

select.addEventListener("input", function (event) {
    setColorScheme( event.target.value);
    localStorage.colorScheme =  event.target.value;;
});

let form = document.querySelector("form")

form?.addEventListener("submit", function (event) {
    event.preventDefault();
    const data = new FormData(form);
    const params = [];
    for (let [name, value] of data) {
        params.push(`${name}=${encodeURIComponent(value)}`);
    }
    const query = params.join('&');
    const url = `${form.action}?${query}`;
    location.href = url;
});

export async function fetchJSON(url) {
    try {
        const response = await fetch(url);
        console.log(response);
        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
    }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    containerElement.innerHTML = '';
    projects.forEach(project => {
        const article = document.createElement('article');
        const imgPath = project.image.startsWith('images') ? BASE_PATH + project.image : project.image;
        article.innerHTML = `
            <${headingLevel}>${project.title}</${headingLevel}>
            <img src="${imgPath}" alt="${project.title}">
            <div><p>${project.description}</p><p>c. ${project.year}</p></div>
        `;
        containerElement.appendChild(article);
    });
}

export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
}