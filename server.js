import express from "express";
import pg from "pg";
import path from "node:path";
import {fileURLToPath} from "node:url";
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express(); app.use(express.json({limit:"1mb"}));
const PORT=process.env.PORT||3000;
const pool=process.env.DATABASE_URL?new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}):null;
async function db(sql,params=[]){if(!pool) return null; return pool.query(sql,params);}
async function init(){
 if(!pool)return;
 await db(`CREATE TABLE IF NOT EXISTS nexus_projects(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL,description TEXT DEFAULT '',created_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE IF NOT EXISTS nexus_modules(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),project_id UUID REFERENCES nexus_projects(id) ON DELETE CASCADE,name TEXT NOT NULL,type TEXT NOT NULL,config JSONB DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE IF NOT EXISTS nexus_events(id BIGSERIAL PRIMARY KEY,type TEXT NOT NULL,payload JSONB DEFAULT '{}'::jsonb,created_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE IF NOT EXISTS nexus_users(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),email TEXT UNIQUE NOT NULL,role TEXT DEFAULT 'user',created_at TIMESTAMPTZ DEFAULT now());`);
}
app.get("/health",async(_,res)=>{try{if(pool)await db("SELECT 1");res.json({ok:true,service:"NEXUS",database:!!pool,time:new Date().toISOString()})}catch(e){res.status(503).json({ok:false,error:e.message})}});
app.get("/api/projects",async(_,res)=>{try{const r=await db("SELECT * FROM nexus_projects ORDER BY created_at DESC");res.json(r?r.rows:[])}catch(e){res.status(500).json({error:e.message})}});
app.post("/api/projects",async(req,res)=>{try{const name=String(req.body.name||"").trim();if(!name)return res.status(400).json({error:"name is required"});const r=await db("INSERT INTO nexus_projects(name,description) VALUES($1,$2) RETURNING *",[name,String(req.body.description||"")]);if(!r)return res.status(503).json({error:"DATABASE_URL is not configured"});await db("INSERT INTO nexus_events(type,payload) VALUES($1,$2)",["project.created",{id:r.rows[0].id,name}]);res.status(201).json(r.rows[0])}catch(e){res.status(500).json({error:e.message})}});
app.get("/api/modules",async(req,res)=>{try{const r=await db("SELECT * FROM nexus_modules WHERE project_id=$1 ORDER BY created_at",[req.query.project_id]);res.json(r?r.rows:[])}catch(e){res.status(500).json({error:e.message})}});
app.post("/api/modules",async(req,res)=>{try{const {project_id,name,type,config={}}=req.body;if(!project_id||!name||!type)return res.status(400).json({error:"project_id, name and type are required"});const r=await db("INSERT INTO nexus_modules(project_id,name,type,config) VALUES($1,$2,$3,$4) RETURNING *",[project_id,name,type,config]);if(!r)return res.status(503).json({error:"DATABASE_URL is not configured"});await db("INSERT INTO nexus_events(type,payload) VALUES($1,$2)",["module.created",{id:r.rows[0].id,project_id,type}]);res.status(201).json(r.rows[0])}catch(e){res.status(500).json({error:e.message})}});
app.get("/api/events",async(_,res)=>{try{const r=await db("SELECT * FROM nexus_events ORDER BY created_at DESC LIMIT 50");res.json(r?r.rows:[])}catch(e){res.status(500).json({error:e.message})}});
app.use(express.static(path.join(__dirname,"public")));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
init().then(()=>app.listen(PORT,()=>console.log(`NEXUS listening on ${PORT}`))).catch(e=>{console.error(e);process.exit(1)});