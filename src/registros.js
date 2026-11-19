// Cliente del servicio de registros (base de datos del negocio).
const REGISTROS_URL = process.env.REGISTROS_URL || "http://localhost:8082/api";

class ErrorRegistros extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

/** Llama la API del servicio de registros y devuelve el JSON de la respuesta. */
async function registros(metodo, ruta, cuerpo) {
  let resp;
  try {
    resp = await fetch(REGISTROS_URL + ruta, {
      method: metodo,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
    });
  } catch (e) {
    throw new ErrorRegistros(`No se pudo conectar con el servicio de registros (${REGISTROS_URL})`, 0);
  }
  const texto = await resp.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch (e) {
    datos = null;
  }
  if (!resp.ok) {
    throw new ErrorRegistros(`Servicio de registros: ${(datos && datos.error) || "error " + resp.status}`, resp.status);
  }
  return datos;
}

module.exports = { REGISTROS_URL, registros };
