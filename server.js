const express = require('express');
const routes = require('./routes/index');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use('/', routes);

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});

module.exports = app;
