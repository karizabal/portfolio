import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

(async () => {
  const projects = await fetchJSON('../lib/projects.json');
  const container = document.querySelector('.projects');
  const title = document.querySelector('.projects-title');

  title.textContent = `${projects.length} ${title.textContent}`;
  renderProjects(projects, container, 'h2');

  function renderPieChart(projectsGiven) {
    const svg = d3.select('svg');
    const legend = d3.select('.legend');

    svg.selectAll('path').remove();
    legend.selectAll('li').remove();

    let rolledData = d3.rollups(
      projectsGiven,
      (v) => v.length,
      (d) => d.year,
    );
    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
    let sliceGenerator = d3.pie().value((d) => d.value);
  
    let data = rolledData.map(([year, count]) => {
      return { value: count, label: year };
    });

    const colors = d3.scaleOrdinal(d3.quantize(d3.interpolateViridis, data.length));

    let arcData = sliceGenerator(data);
    let arcs = arcData.map((d) => arcGenerator(d));

    arcs.forEach((arc, idx) => {
      d3.select('svg')
        .append('path')
        .attr('d', arc)
        .attr('fill', colors(idx));
    })

    data.forEach((d, idx) => {
      legend
        .append('li')
        .attr('style', `--color:${colors(idx)}`)
        .attr('class', 'legend-item')
        .html(`<span class="swatch"></span> ${d.label} <span class="count">(${d.value})</span>`);
    })
  };

  renderPieChart(projects);

  let query = '';
  let searchInput = document.querySelector('.searchBar');
  
  searchInput.addEventListener('input', (event) => {
    query = event.target.value;
    let filtered = projects.filter((project) => {
      let values = Object.values(project).join('\n').toLowerCase();
      return values.includes(query.toLowerCase());
    });
    renderProjects(filtered, container, 'h2');
    renderPieChart(filtered);
  });

})();