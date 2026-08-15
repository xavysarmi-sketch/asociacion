// Servidor estático mínimo para pruebas locales. No conoce Firebase ni credenciales.
const http=require("http");
const fs=require("fs");
const path=require("path");
const root=__dirname;
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8"};
http.createServer((req,res)=>{
  const pathname=new URL(req.url,"http://127.0.0.1").pathname;
  const relative=pathname==="/"?"index.html":decodeURIComponent(pathname.slice(1));
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end("Forbidden");return;}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404);res.end("Not found");return;}
    res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});
    res.end(data);
  });
}).listen(4173,"127.0.0.1",()=>console.log("NH DEV http://127.0.0.1:4173"));
