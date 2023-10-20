const express = require('express');
const path = require('path');
const routes = require('./routes/index');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use('/', routes);
app.use(express.static(path.join(__dirname, 'frontend')));

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});

module.exports = app;
