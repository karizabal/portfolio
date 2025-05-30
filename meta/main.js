import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  
  return data;
}
  
function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: 'https://github.com/karizabal/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };
  
      Object.defineProperty(ret, 'lines', {
        value: lines,
      });
  
      return ret;
  });
}

function renderCommitInfo(data, commits) {
  d3.select('#stats').selectAll('*').remove();
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  const nFiles = d3.group(data, d => d.file).size;
  const fileLengths = d3.rollups(
    data,
    (v) => d3.max(v, (v) => v.line),
    (d) => d.file,
  );
  const avgFileLength = d3.mean(fileLengths, (d) => d[1]);
  const avgLineLength = d3.mean(
    commits,
    C => d3.mean(C.lines, line => line.length)
  );
  const maxDepth = d3.max(data, d => d.depth);
  
  dl.append('dt').text('Commits');
  dl.append('dd').text(commits.length);

  dl.append('dt').text('Files');
  dl.append('dd').text(nFiles);

  dl.append('dt').html('Total <abbr title="lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Avg. File Length');
  dl.append('dd').text(d3.format('.1f')(avgFileLength));

  dl.append('dt').text('Avg. Line Length');
  dl.append('dd').text(d3.format('.1f')(avgLineLength));

  dl.append('dt').text('Max Depth');
  dl.append('dd').text(maxDepth);
}

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 15 };

  const svg = (d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible')
  );
  
  xScale = (d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice()
  );
  yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 30]);
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  const dots = svg.append('g').attr('class', 'dots');
  (dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', 3)
    .attr('fill', 'rgb(139, 207, 6)')
    .attr('r', (d) => rScale(d.totalLines))
    .style('fill-opacity', 0.6)
    .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 1);
        renderTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
    })
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipVisibility(false);
    })
  );
  
  const gridlines = (svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`)
  );

  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
  
  const xAxis = d3.axisBottom(xScale);
  const yAxis = (d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00')
  );

  (svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .attr('class', 'x-axis')
    .call(xAxis)
  );

  (svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .attr('class', 'y-axis')
    .call(yAxis)
  );

  createBrushSelector(svg);
}

function updateScatterPlot(data, commits) {
  const svg = d3.select('#chart').select('svg');

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxis = d3.axisBottom(xScale);

  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'rgb(139, 207, 6)')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
};

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  time.textContent = commit.time;
  author.textContent = commit.author;
  lines.textContent = commit.lines.length;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.top = `${event.clientY}px`;
  const tooltipWidth = tooltip.offsetWidth;
  if (event.clientX + tooltipWidth > window.innerWidth) {
    tooltip.style.left = `${event.clientX - tooltipWidth}px`;
  } else if (event.clientX + tooltipWidth <= window.innerWidth) {
    tooltip.style.left = `${event.clientX}px`;
  }
}

function createBrushSelector(svg) {
  svg.call(d3.brush().on('start brush end', brushed));
  svg.selectAll('.dots, .overlay ~ *').raise();
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }
  const [x0, x1] = selection.map((d) => d[0]);
  const [y0, y1] = selection.map((d) => d[1]);
  const x = xScale(commit.datetime); 
  const y = yScale(commit.hourFrac); 
  
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}

let xScale;
let yScale;
let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits); 
renderScatterPlot(data, commits);

let commitProgress = 100;
let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);

let filteredCommits = commits;
let colors = d3.scaleOrdinal(d3.schemeTableau10);
function updateFileDisplay(filteredCommits) {
  let lines = filteredCommits.flatMap(d => d.lines);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    })
    .sort((a, b) => b.lines.length - a.lines.length);
  let filesContainer = d3.select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(
      enter => enter.append('div')
        .call(div => {
          div.append('dt').append('code');
          div.append('dd');
        })
    );
  filesContainer
    .select('dt')
    .html(d => `
      <code>${d.name}</code>
      <small>${d.lines.length} line(s)</small>
    `);
  filesContainer
    .select('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('style', (d) => `--color: ${colors(d.type)}`);
  }

let commitMaxTime = timeScale.invert(commitProgress);

const slider = document.getElementById('commit-progress');
const time = document.getElementById('time');

function onTimeSliderChange() {
  commitProgress = +slider.value;
  commitMaxTime  = timeScale.invert(commitProgress);
  time.textContent = commitMaxTime
    .toLocaleString('en', { dateStyle: 'long', timeStyle: 'short' });
  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  renderCommitInfo(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

slider.addEventListener('input', onTimeSliderChange);
onTimeSliderChange();