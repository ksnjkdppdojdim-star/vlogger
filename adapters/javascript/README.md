# VLogger JavaScript Adapter

Install:

##npm install vlogger
Usage (Express):
```js
const express = require('express');
const VLogger = require('vlogger');

const app = express();
const logger = new VLogger();
app.use(logger.middleware());
```
