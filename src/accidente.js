// Workers del proceso 1: Investigar y Reportar Accidente de Trabajo.
// Cada worker guarda lo que corresponde en el servicio de registros y usa lo que este le devuelve.
const { Variables } = require("camunda-external-task-client-js");
const { conManejoDeErrores } = require("./camunda");
const { registros } = require("./registros");

module.exports = (client) => {
  // Registra el accidente en la base de datos y avisa al área SST.
  client.subscribe("notificarSst", conManejoDeErrores("notificarSst", async ({ task, taskService }) => {
    const v = task.variables;
    const accidente = await registros("POST", "/accidentes", {
      processInstanceId: task.processInstanceId,
      nombreTrabajador: v.get("nombreTrabajador"),
      documentoTrabajador: v.get("documentoTrabajador"),
      sede: v.get("sede"),
      fechaEvento: v.get("fechaEvento"),
      descripcionEvento: v.get("descripcionEvento")
    });
    console.log(`[notificarSst] Accidente ${accidente.id} registrado. Correo al área SST: evento de ${accidente.nombreTrabajador} en la sede ${accidente.sede}`);
    const vars = new Variables();
    vars.setTyped("idAccidente", { value: accidente.id, type: "Long" });
    vars.set("fechaNotificacionSst", new Date().toISOString());
    await taskService.complete(task, vars);
  }));

  // Reporte a la Dirección Territorial. El servicio de registros asigna el radicado.
  client.subscribe("reportarMintrabajo", conManejoDeErrores("reportarMintrabajo", async ({ task, taskService }) => {
    const v = task.variables;
    const reporte = await registros("POST", `/accidentes/${v.get("idAccidente")}/reportes`, {
      entidad: "MINTRABAJO",
      numeroFurat: v.get("numeroFurat"),
      gravedad: v.get("gravedad")
    });
    console.log(`[reportarMintrabajo] Accidente ${v.get("gravedad")} reportado a la Dirección Territorial. Radicado ${reporte.radicado}`);
    await taskService.complete(task, new Variables().set("radicadoMinTrabajo", reporte.radicado));
  }));

  client.subscribe("reportarArlEps", conManejoDeErrores("reportarArlEps", async ({ task, taskService }) => {
    const v = task.variables;
    const reporte = await registros("POST", `/accidentes/${v.get("idAccidente")}/reportes`, {
      entidad: "ARL_EPS",
      numeroFurat: v.get("numeroFurat"),
      gravedad: v.get("gravedad")
    });
    console.log(`[reportarArlEps] FURAT ${v.get("numeroFurat")} enviado a ARL y EPS. Radicado ${reporte.radicado}`);
    const vars = new Variables();
    vars.set("radicadoArl", reporte.radicado);
    vars.set("fechaReporteArl", reporte.fecha);
    await taskService.complete(task, vars);
  }));

  // Deja el caso disponible para la ARL. La ARL responde desde su portal (puerto 8083),
  // que le entrega a Camunda el mensaje "conceptoArl" que espera la compuerta basada en eventos.
  client.subscribe("remitirInvestigacionArl", conManejoDeErrores("remitirInvestigacionArl", async ({ task, taskService }) => {
    const v = task.variables;
    const caso = await registros("POST", `/accidentes/${v.get("idAccidente")}/remision`, {
      causas: `Inmediatas: ${v.get("causasInmediatas")}. Básicas: ${v.get("causasBasicas")}`,
      conclusiones: v.get("conclusionesInvestigacion")
    });
    console.log(`[remitirInvestigacionArl] Caso ${caso.id} remitido a la ARL (radicado ${caso.radicadoArl}). Queda esperando su concepto`);
    const vars = new Variables();
    vars.set("investigacionRemitida", true);
    vars.set("fechaRemisionArl", caso.fechaRemision);
    await taskService.complete(task, vars);
  }));

  // Antes era un JavaDelegate. Actualiza la matriz de riesgos y cierra el caso en la base de datos.
  client.subscribe("actualizarMatrizRiesgos", conManejoDeErrores("actualizarMatrizRiesgos", async ({ task, taskService }) => {
    const v = task.variables;
    const fila = await registros("POST", `/accidentes/${v.get("idAccidente")}/matriz-riesgos`, {
      tipoEvento: v.get("tipoEvento"),
      gravedad: v.get("gravedad"),
      peligro: v.get("causasInmediatas"),
      controles: v.get("accionesCorrectivas")
    });
    const registro = `Sede ${fila.sede}: riesgo ${fila.nivelRiesgo} por "${fila.peligro}". Próxima inspección: ${fila.proximaInspeccion}`;
    console.log(`[actualizarMatrizRiesgos] ${registro}`);
    const vars = new Variables();
    vars.set("matrizActualizada", true);
    vars.set("fechaActualizacionMatriz", fila.fechaActualizacion);
    vars.set("nivelRiesgo", fila.nivelRiesgo);
    vars.set("proximaInspeccion", fila.proximaInspeccion);
    vars.set("registroMatriz", registro);
    await taskService.complete(task, vars);
  }));
};
