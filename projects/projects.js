import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

(async () => {
  const projects = await fetchJSON('../lib/projects.json');
  const container = document.querySelector('.projects');
  renderProjects(projects, container, 'h2');
  const title = document.querySelector('.projects-title');
  title.textContent = `${projects.length} ${title.textContent}`;
  let rolledData = d3.rollups(
    projects,
    (v) => v.length,
    (d) => d.year,
  );
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let sliceGenerator = d3.pie().value((d) => d.value);
  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  let data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  let arcData = sliceGenerator(data);
  let arcs = arcData.map((d) => arcGenerator(d));

  arcs.forEach((arc, idx) => {
    d3.select('svg')
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(idx));
  })

  let legend = d3.select('.legend');
  data.forEach((d, idx) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(idx)}`)
      .attr('class', 'legend-item')
      .html(`<span class="swatch"></span> ${d.label} <span class="count">(${d.value})</span>`);
  })
  let query = '';
  let searchInput = document.querySelector('.searchBar');
  searchInput.addEventListener('input', (event) => {
    query = event.target.value;
    let filteredProjects = projects.filter((project) => {
      let values = Object.values(project).join('\n').toLowerCase();
      return values.includes(query.toLowerCase());
    });
    renderProjects(filteredProjects, container, 'h2');
  });

})();