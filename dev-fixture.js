/* DATOS DE PRUEBA — NO PRODUCCIÓN
   Fixture íntegramente ficticio para Firebase Emulator Suite.
   Parte de schema/data v10 para ejercitar de forma real la migración 10→11. */
window.NH_DEV_FIXTURE={
  _version:10,
  fixtureLabel:"DATOS DE PRUEBA — NO PRODUCCIÓN",
  reportMonth:"Ene",
  reportYear:2027,
  monthlyFee:41,
  rate:4,
  updatedAt:0,
  members:[
    {
      id:"dev-asoc-a",name:"Asociado Prueba A",type:"asociado",ref:null,
      joinMonth:"Ene",joinYear:2027,ciclo:12,aporte:37,origen:"app",phone:"",
      history:[],loans:[],closedLoans:[]
    },
    {
      id:"dev-asoc-b",name:"Asociado Prueba B",type:"asociado",ref:null,
      joinMonth:"Ene",joinYear:2027,ciclo:24,aporte:43,origen:"app",phone:"",
      history:[],loans:[],closedLoans:[]
    },
    {
      id:"dev-asoc-acento",name:"Árbol Seguro",type:"asociado",ref:null,
      joinMonth:"Ene",joinYear:2027,ciclo:12,aporte:39,origen:"app",phone:"",
      history:[],loans:[],closedLoans:[]
    },
    {
      id:"dev-asoc-dup-1",name:"Nombre Duplicado",type:"asociado",ref:null,
      joinMonth:"Ene",joinYear:2027,ciclo:12,aporte:35,origen:"app",phone:"",
      history:[],loans:[],closedLoans:[]
    },
    {
      id:"dev-asoc-dup-2",name:"Nómbré   Duplicado",type:"asociado",ref:null,
      joinMonth:"Ene",joinYear:2027,ciclo:12,aporte:36,origen:"app",phone:"",
      history:[],loans:[],closedLoans:[]
    },
    {
      // CASO 1: el ID válido debe permanecer intacto.
      id:"dev-tercero-id",name:"Tercero ID Válido",type:"tercero",ref:"dev-asoc-a",
      joinMonth:null,joinYear:null,ciclo:null,origen:"app",phone:"",
      history:[{gMonth:"Ene",gYear:2027,capital:180,lid:"dev-ayuda-id"}],
      loans:[{
        id:"dev-ayuda-id",gMonth:"Ene",gYear:2027,capital:180,total:198,n:2,
        inst:99,cuotas:[99,99],rate:5,tipoEnConcesion:"tercero",
        avalistaEnConcesion:"Asociado Prueba A",cicloEnConcesion:0,
        pays:[{m:"Feb",y:2027,paid:true},{m:"Mar",y:2027,paid:false}]
      }],closedLoans:[]
    },
    {
      // CASOS 2 y 7: coincidencia única; el histórico debe quedar congelado.
      id:"dev-tercero-nombre",name:"Tercero Nombre Único",type:"tercero",ref:"Asociado Prueba B",
      joinMonth:null,joinYear:null,ciclo:null,origen:"app",phone:"",
      history:[{gMonth:"Ene",gYear:2027,capital:220,lid:"dev-ayuda-historica"}],
      loans:[{
        id:"dev-ayuda-historica",gMonth:"Ene",gYear:2027,capital:220,total:242,n:2,
        inst:121,cuotas:[121,121],rate:5,tipoEnConcesion:"tercero",
        avalistaEnConcesion:"Avalista Histórico Inmutable",cicloEnConcesion:0,
        pays:[{m:"Feb",y:2027,paid:false},{m:"Mar",y:2027,paid:false}]
      }],closedLoans:[]
    },
    {
      // CASO 3: sin coincidencia; conservar para revisión.
      id:"dev-tercero-sin-match",name:"Tercero Sin Coincidencia",type:"tercero",ref:"Avalista Inexistente",
      joinMonth:null,joinYear:null,ciclo:null,origen:"app",phone:"",
      history:[],loans:[],closedLoans:[]
    },
    {
      // CASO 4: dos asociados normalizan igual; nunca elegir automáticamente.
      id:"dev-tercero-ambiguo",name:"Tercero Ambiguo",type:"tercero",ref:"  NOMBRE DUPLICADO ",
      joinMonth:null,joinYear:null,ciclo:null,origen:"app",phone:"",
      history:[],loans:[],closedLoans:[]
    },
    {
      // CASO 5: diferencias de caja, espacios y tilde; coincidencia única.
      id:"dev-tercero-normalizado",name:"Tercero Normalizado",type:"tercero",ref:"  arbol   seguro ",
      joinMonth:null,joinYear:null,ciclo:null,origen:"app",phone:"",
      history:[],loans:[],closedLoans:[]
    },
    {
      // CASO 6: alta de app, ausente de INITIAL; también debe migrarse.
      id:"m-dev-tercero-app",name:"Tercero Creado en App",type:"tercero",ref:"ASOCIADO   PRUEBA A",
      joinMonth:null,joinYear:null,ciclo:null,origen:"app",phone:"",
      history:[],loans:[],closedLoans:[]
    }
  ],
  monthlyData:{},
  gruposCierre:[],
  aportesPuntuales:{},
  extras:{}
};
