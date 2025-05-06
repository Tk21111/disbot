import discord
from discord.ext import commands
import logging
from dotenv import load_dotenv
import os

import asyncio
from pymongo import AsyncMongoClient
from typing import TypedDict
from pymongo.collection import Collection


#init mogodb
URI = os.getenv("MOGODB")
CLIENT = AsyncMongoClient(URI)

class Email(TypedDict):
    email: str
    pwd: int
    watcher : list

database = CLIENT.get_database("check")
col = database.get_collection("email")
collection : Collection[Email] = database["email"]

#init imap
IMAP_SLL_SEVER = "imap.gmail.com"
IMAP_SLL_PORT = 993

#init discord
load_dotenv()
token = os.getenv("DISCORD_TOKEN")

handler = logging.FileHandler(filename='discord.log' , encoding='utf-8' , mode='w')
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!" , intents=intents)

@bot.event
async def on_ready():
    print(f"We re ready to go , {bot.user.name}")
    
    
    
@bot.event
async def on_member_join(mem):
    await mem.send(f"welcome {mem.name}")
    
    
@bot.event
async def on_message(msg):
    if(msg.author == bot.user):
        return
    
    if("shit" in msg.content.lower()):
        await msg.delete()
        #mention @
        await msg.channel.send(f"{msg.author.mention} u too")
        
    #continous process other cmd
    await bot.process_commands(msg)
    
#read !hello
@bot.command()
async def hello(ctx):
    await ctx.send(f"hello {ctx.author.mention} !")
    
@bot.command()
@commands.has_role("Aodnon")
async def checkmail(ctx):
    
    try:
        
        
        email = await col.findOne({"user" : ctx.author})
        
        
        
    except Exception as e :
        await ctx.send(f"cannot connect mogodb or something ${e}")
    
@bot.command()
@commands.has_role("Aodnon")
async def addListen(ctx, email: str, pwd: str):
    
    await ctx.send(f"Email: {email}, Password: {pwd}")
    
    
    
    try:
        col.insert_one({
                "email" : "email",
                "pwd" : "pwd",
                "watcher" : "[ctx.author.id]"
            })
        # data = await col.find_one({"_id" : "5555555"})
        
        # if(data):
        #     watcher_list = data.get("watcher", [])
        #     if ctx.author.id not in watcher_list:
        #         watcher_list.append(ctx.author.id)
                
        #     await col.update_one(
        #             {"_id": "5555555"},
        #             {"$set": {"watcher": watcher_list}}
        #         )
        # else :
        #     col.insert_one({
        #         "email" : email,
        #         "pwd" : pwd,
        #         "watcher" : [ctx.author.id]
        #     })
        
        
        result = await col.insert_one({"user" : []})
       
        
        
        
    except Exception as e :
        await ctx.send(f"cannot connect mogodb or something ${e}")
     
bot.run(token , log_handler=handler , log_level=logging.DEBUG)