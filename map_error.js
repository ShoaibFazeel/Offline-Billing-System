const fs = require('fs');
const { SourceMapConsumer } = require('source-map');

const mapPath = 'build/index.js.map';
const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

(async () => {
  const consumer = await new SourceMapConsumer(mapData);
  const pos = { line: 172, column: 247356 };
  const orig = consumer.originalPositionFor(pos);
  console.log('originalPositionFor', pos, orig);
  consumer.destroy();
})();
