// const { ViewModuleSharp } = require("@material-ui/icons");
const mongoose = require("mongoose")

// DeprecationWarning:
mongoose.set('strictQuery', true)

const DB = `mongodb+srv://${process.env.MONGOUSER}:${process.env.MONGOPASS}@cluster0.1xh40ss.mongodb.net/mukunda-blog?retryWrites=true&w=majority`

mongoose.connect(DB).then(()=>{
    console.log('connected successfully to mukunda database');
}).catch((err)=>{console.log('error while connecting to mukunda database')})

module.exports = mongoose.connection;
