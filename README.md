# UT-llano-Alianza Workers
Proyecto de Curso de Profundización Software 1

Aquí están las tareas automáticas de los 3 procesos, hechas en JavaScript con camunda-external-task-client-js.
Cada worker escucha un tópico de Camunda, toma la tarea, la hace y la completa con variables nuevas.
La guía general del proyecto está en el repo ut-llano-alianza-hub.

**Responsable:** Daniel Felipe Espinosa Alvarez

## Integrantes
- Laura Vanessa Hernandez Garcia 160004630
- Vivian Andrea Prado Zuleta 160004632
- Daniel Felipe Espinosa Alvarez 160004707

# Archivos
- index.js: crea el cliente y carga los workers
- src/camunda.js: la dirección de Camunda, cómo buscar la instancia principal y el manejo de errores
- src/registros.js: las llamadas al servicio de registros
- src/accidente.js: workers del proceso 1
- src/asistencia.js: workers del proceso 2
- src/propuesta.js: workers del proceso 3

# Tópicos

## Proceso 1: Investigar y Reportar Accidente de Trabajo (accidente.js)
- notificarSst: guarda el accidente en el servicio de registros y deja la variable idAccidente
- reportarMintrabajo: guarda el reporte al Ministerio y deja el radicado en radicadoMinTrabajo
- reportarArlEps: guarda el reporte a la ARL y EPS y deja el radicado en radicadoArl
- remitirInvestigacionArl: deja el caso esperando el concepto, la ARL responde desde su portal
- actualizarMatrizRiesgos: guarda la matriz de riesgos, cierra el caso y deja nivelRiesgo y proximaInspeccion

## Proceso 2: Programar y Controlar Asistencia del Personal (asistencia.js)
- comunicarTurnosCliente: le avisa al cliente la programación del mes
- comunicarTurnosPersonal: le avisa los turnos al personal
- registrarNovedad: guarda la novedad y deja los totales del mes (totalNovedades, totalHorasNovedad, detalleNovedades)
- cerrarPrefactura: arma la prefactura con las novedades guardadas y deja resumenPrefactura
- recordarVerificacionAsistencia: el recordatorio del temporizador de 1 hora

## Proceso 3: Elaborar Propuesta (propuesta.js)
- consultarAdendasSecop: simula la consulta en SECOP II, si al iniciar se marcó "Simular adenda" devuelve una
- formularPropuestaEconomica: el servicio de registros revisa que el salario no sea menor al mínimo, calcula el valor y guarda la propuesta. Deja valorPropuesta y resumenEconomico
- notificarRadicacion: marca la propuesta como enviada a radicación

# Si algo falla
- Si el servicio de registros dice que un dato está mal se crea un incidente de una vez con el mensaje del error
- Si no hay conexión se intenta 3 veces cada 10 segundos y después se crea el incidente
- Los incidentes se ven en Cockpit, después de arreglar el problema se le da Retry y el worker lo vuelve a intentar

# Cambios para la entrega final
- Los workers pasaron a este repo, antes estaban en la carpeta workers-js del motor
- Los workers de los 3 procesos ahora guardan y consultan datos en el servicio de registros
- La respuesta de la ARL ya no se simula, ahora llega desde el portal de la ARL

---

# Cómo ejecutar
Antes tienen que estar prendidos Camunda (8080) y el servicio de registros (8082)

1. En la carpeta del repo colocar npm install (solo la primera vez)
2. Luego npm start, deben aparecer 13 mensajes "subscribed to topic"

Los workers no usan puerto, ellos le preguntan a Camunda si hay tareas.
Si Camunda o el servicio de registros están en otra dirección se cambian con las variables CAMUNDA_URL (por defecto http://localhost:8080/engine-rest) y REGISTROS_URL (por defecto http://localhost:8082/api)
