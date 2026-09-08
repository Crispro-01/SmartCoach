export const usuarios = [
    { id: "DIR001", nombre: "Carolina Mendoza", correo: "carolina.mendoza@smartcoach.com", rol: "Director", supervisorId: null },
    { id: "SAM001", nombre: "Andrés Salazar", correo: "andres.salazar@smartcoach.com", rol: "Senior Account Manager", supervisorId: "DIR001" },
    { id: "AM001", nombre: "Natalia Herrera", correo: "natalia.herrera@smartcoach.com", rol: "Account Manager", supervisorId: "SAM001" },
    { id: "MGR001", nombre: "Carlos Ramírez", correo: "carlos.ramirez@smartcoach.com", rol: "Manager", supervisorId: "AM001" },
    { id: "COACH001", nombre: "Jessyka Najar", correo: "jessyka.najar@smartcoach.com", rol: "Coach", supervisorId: "MGR001" },
    { id: "COACH002", nombre: "Mateo López", correo: "mateo.lopez@smartcoach.com", rol: "Coach", supervisorId: "MGR001" },
    { id: "TM001", nombre: "Laura Gómez", correo: "laura.gomez@smartcoach.com", rol: "Agente", supervisorId: "COACH001" },
    { id: "TM002", nombre: "Juan Pérez", correo: "juan.perez@smartcoach.com", rol: "Agente", supervisorId: "COACH001" },
    { id: "TM003", nombre: "Daniela Ruiz", correo: "daniela.ruiz@smartcoach.com", rol: "Agente", supervisorId: "COACH001" },
    { id: "TM004", nombre: "Andrés Torres", correo: "andres.torres@smartcoach.com", rol: "Agente", supervisorId: "COACH001" },
    { id: "TM005", nombre: "Camila Rodríguez", correo: "camila.rodriguez@smartcoach.com", rol: "Agente", supervisorId: "COACH001" },
    { id: "TM006", nombre: "Valentina Rojas", correo: "valentina.rojas@smartcoach.com", rol: "Agente", supervisorId: "COACH002" }
];
