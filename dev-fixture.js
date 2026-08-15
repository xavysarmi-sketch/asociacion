/* DATOS DE PRUEBA — NO PRODUCCIÓN
   Fixture íntegramente ficticio para Firebase Emulator Suite. */
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
      history:[{gMonth:"Ene",gYear:2027,capital:180,lid:"dev-ayuda-a"}],
      loans:[{
        id:"dev-ayuda-a",gMonth:"Ene",gYear:2027,capital:180,total:198,n:2,
        inst:99,cuotas:[99,99],rate:5,tipoEnConcesion:"asociado",
        avalistaEnConcesion:null,cicloEnConcesion:12,
        pays:[{m:"Feb",y:2027,paid:true},{m:"Mar",y:2027,paid:false}]
      }],closedLoans:[]
    },
    {
      id:"dev-asoc-b",name:"Asociado Prueba B",type:"asociado",ref:null,
      joinMonth:"Ene",joinYear:2027,ciclo:24,aporte:43,origen:"app",phone:"",
      history:[],loans:[],closedLoans:[]
    },
    {
      id:"dev-tercero",name:"Tercero Prueba",type:"tercero",ref:"dev-asoc-a",
      joinMonth:null,joinYear:null,ciclo:null,origen:"app",phone:"",
      history:[{gMonth:"Ene",gYear:2027,capital:220,lid:"dev-ayuda-tercero"}],
      loans:[{
        id:"dev-ayuda-tercero",gMonth:"Ene",gYear:2027,capital:220,total:242,n:2,
        inst:121,cuotas:[121,121],rate:5,tipoEnConcesion:"tercero",
        avalistaEnConcesion:"Asociado Prueba A",cicloEnConcesion:0,
        pays:[{m:"Feb",y:2027,paid:false},{m:"Mar",y:2027,paid:false}]
      }],closedLoans:[]
    }
  ],
  monthlyData:{},
  gruposCierre:[],
  aportesPuntuales:{},
  extras:{}
};
