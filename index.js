// Punto de entrada: crea el cliente y registra los workers de los 3 procesos.
const { Client, logger } = require("camunda-external-task-client-js");
const { BASE_URL } = require("./src/camunda");
const { REGISTROS_URL } = require("./src/registros");

const client = new Client({
  baseUrl: BASE_URL,
  use: logger,
  asyncResponseTimeout: 10000, // long polling de 10 s
  lockDuration: 20000
});

require("./src/accidente")(client);
require("./src/asistencia")(client);
require("./src/propuesta")(client);

console.log(`Workers de UT Llano Alianza escuchando en ${BASE_URL}`);
console.log(`Servicio de registros: ${REGISTROS_URL}`);
