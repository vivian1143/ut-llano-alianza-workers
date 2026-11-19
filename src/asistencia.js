// Workers del proceso 2: Programar y Controlar Asistencia del Personal.
const { Variables } = require("camunda-external-task-client-js");
const { conManejoDeErrores } = require("./camunda");
const { registros } = require("./registros");

module.exports = (client) => {
  client.subscribe("comunicarTurnosCliente", conManejoDeErrores("comunicarTurnosCliente", async ({ task, taskService }) => {
    const v = task.variables;
    console.log(`[comunicarTurnosCliente] Programación de ${v.get("mesProgramacion")} enviada al cliente del proyecto ${v.get("proyecto")}`);
    await taskService.complete(task, new Variables().set("fechaEnvioCliente", new Date().toISOString()));
  }));

  // Evento intermedio de lanzamiento de mensaje "Turnos comunicados al personal"
  client.subscribe("comunicarTurnosPersonal", conManejoDeErrores("comunicarTurnosPersonal", async ({ task, taskService }) => {
    console.log(`[comunicarTurnosPersonal] Turnos enviados al personal de la sede ${task.variables.get("sede")}`);
    await taskService.complete(task, new Variables().set("turnosComunicados", true));
  }));

  // Antes era un JavaDelegate. Guarda la novedad en la base de datos.
  // Los totales del mes los calcula el servicio de registros y el proceso los usa después.
  client.subscribe("registrarNovedad", conManejoDeErrores("registrarNovedad", async ({ task, taskService }) => {
    const v = task.variables;
    const r = await registros("POST", "/novedades", {
      tareaId: task.id,
      processInstanceId: task.processInstanceId,
      proyecto: v.get("proyecto"),
      sede: v.get("sede"),
      mes: v.get("mesProgramacion"),
      fecha: v.get("fechaVerificacion"),
      trabajador: v.get("trabajadorNovedad"),
      tipo: v.get("tipoNovedad"),
      horas: v.get("horasNovedad")
    });
    console.log(`[registrarNovedad] Novedad ${r.novedad.id} guardada. En el mes van ${r.totalNovedades} novedades y ${r.totalHoras} h`);
    const vars = new Variables();
    vars.setTyped("totalNovedades", { value: r.totalNovedades, type: "Long" });
    vars.setTyped("totalHorasNovedad", { value: r.totalHoras, type: "Double" });
    vars.set("detalleNovedades", r.detalle);
    await taskService.complete(task, vars);
  }));

  // Antes era un JavaDelegate. El servicio de registros arma la prefactura con las novedades guardadas.
  client.subscribe("cerrarPrefactura", conManejoDeErrores("cerrarPrefactura", async ({ task, taskService }) => {
    const v = task.variables;
    const prefactura = await registros("POST", "/prefacturas", {
      processInstanceId: task.processInstanceId,
      proyecto: v.get("proyecto"),
      sede: v.get("sede"),
      mes: v.get("mesProgramacion")
    });
    console.log(`[cerrarPrefactura] Prefactura ${prefactura.id}: ${prefactura.resumen.replace(/\n/g, " ")}`);
    const vars = new Variables();
    vars.setTyped("idPrefactura", { value: prefactura.id, type: "Long" });
    vars.set("resumenPrefactura", prefactura.resumen);
    vars.set("prefacturaCerrada", true);
    await taskService.complete(task, vars);
  }));

  // Lo dispara el temporizador no interruptivo de "Verificar asistencia diaria en sede"
  client.subscribe("recordarVerificacionAsistencia", conManejoDeErrores("recordarVerificacionAsistencia", async ({ task, taskService }) => {
    console.log(`[recordarVerificacionAsistencia] Recordatorio al supervisor de la sede ${task.variables.get("sede")}: falta verificar la asistencia`);
    await taskService.complete(task, new Variables().set("ultimoRecordatorio", new Date().toISOString()));
  }));
};
