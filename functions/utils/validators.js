
const isEmail = (email) => {
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(email.match(emailRegEx)) return true;
    else return false;
}
const isEmpty = (string) => {
    if(string.trim() === '') return true
    else return false
}


exports.validateSignUpData = (data) => {
    const errors= {}

     if(isEmpty(data.email)){
         errors.email = 'Email must not be empty'
     }else if(!isEmail(data.email)){
         errors.email = 'Email must be a valid email address'
     }


     if(isEmpty(data.password)){
         errors.password = 'Password must not be empty'
     }
     if(isEmpty(data.confirmPassword)){
         errors.confirmPassword = 'Confirm password'
     }else
     if(data.password!==data.confirmPassword){
         errors.confirmPassword = 'Passwords must match'
     }
     if(isEmpty(data.username)){
        errors.username= 'Username must not be empty'
     }

     return {
         errors,
         valid: Object.keys(errors).length === 0 ? true : false
     }
}

exports.validateLoginData = (data) => {
    let errors = {}

    if(isEmpty(data.email)){
        return res.status(400).json({email: 'must not be empty'})
    }
    if(isEmpty(data.password)){
        return res.status(400).json({password: 'must not be empty'})
    }
    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

exports.useReducedUser = (data) => {
   let userData = {}

   if(!isEmpty(data.bio.trim())) userData.bio = data.bio
   if(!isEmpty(data.website.trim())){
       if(data.website.trim().substring(0,4) !== 'http'){
            userData.website = `http://${data.website}`
       }
       userData.website = data.website
   }
   if(!isEmpty(data.location.trim())) userData.location = data.location
   return userData
}