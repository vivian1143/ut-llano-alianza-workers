// Workers del proceso 3: Elaborar Propuesta.
const { Variables } = require("camunda-external-task-client-js");
const { conManejoDeErrores, instanciaPrincipal } = require("./camunda");
const { registros } = require("./registros");

module.exports = (client) => {
  // Simula la consulta en SECOP II. Si al iniciar se marcó "Simular adenda", devuelve una.
  client.subscribe("consultarAdendasSecop", conManejoDeErrores("consultarAdendasSecop", async ({ task, taskService }) => {
    const proceso = task.variables.get("numeroProceso");
    const hayAdendas = task.variables.get("simularAdenda") === true;
    const vars = new Variables();
    vars.set("hayAdendas", hayAdendas);
    vars.set("detalleAdenda", hayAdendas
      ? `Adenda No. 1 al proceso ${proceso}: se modifica la experiencia mínima exigida.`
      : "Sin adendas publicadas");
    console.log(`[consultarAdendasSecop] Proceso ${proceso}: hayAdendas=${hayAdendas}`);
    await taskService.complete(task, vars);
  }));

  // Antes era un JavaDelegate (subproceso económico).
  // El servicio de registros valida los datos contra el salario mínimo, calcula el valor y guarda la propuesta:
  // valor = operarios x salario x (1 + factor prestacional) x meses x (1 + AIU/100)
  client.subscribe("formularPropuestaEconomica", conManejoDeErrores("formularPropuestaEconomica", async ({ task, taskService }) => {
    const v = task.variables;
    const principal = await instanciaPrincipal(task.processInstanceId);
    const propuesta = await registros("POST", "/propuestas/calculo", {
      processInstanceId: principal,
      numeroProceso: v.get("numeroProceso"),
      entidadContratante: v.get("entidadContratante"),
      modalidad: v.get("modalidadContratacion"),
      numeroOperarios: v.get("numeroOperarios"),
      salarioBase: v.get("salarioBase"),
      factorPrestacional: v.get("factorPrestacional"),
      mesesContrato: v.get("mesesContrato"),
      porcentajeAiu: v.get("porcentajeAiu")
    });
    console.log(`[formularPropuestaEconomica] Propuesta ${propuesta.id}: ${propuesta.resumen}`);
    const vars = new Variables();
    vars.setTyped("idPropuesta", { value: propuesta.id, type: "Long" });
    vars.setTyped("costoPersonal", { value: Number(propuesta.costoPersonal), type: "Double" });
    vars.setTyped("valorPropuesta", { value: Number(propuesta.valorPropuesta), type: "Double" });
    vars.set("resumenEconomico", propuesta.resumen);
    await taskService.complete(task, vars);
  }));

  // Evento final de mensaje "Propuesta enviada a radicación". Marca la propuesta como enviada.
  client.subscribe("notificarRadicacion", conManejoDeErrores("notificarRadicacion", async ({ task, taskService }) => {
    const v = task.variables;
    const propuesta = await registros("POST", `/propuestas/${v.get("idPropuesta")}/radicacion`);
    console.log(`[notificarRadicacion] Propuesta del proceso ${propuesta.numeroProceso} enviada a radicación`);
    await taskService.complete(task, new Variables().set("fechaEnvioRadicacion", propuesta.fechaRadicacion));
  }));
};
