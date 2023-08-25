/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
const AWS = require("aws-sdk");
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter');
const axios = require('axios/dist/browser/axios.cjs');
let dataBase = {
  users: [],
}

let users = {
    id: 0,
    name : '',
    weight: '',
    height : '',
    user: '',
    planEjercicio: {
        lagartijas:0,
        sentadillas:0,
        abdominales:0,
        repeticiones: 0
    },
    progress: 0,
    condition : '',
    imc: {
        imc:'',
        category:''
    }
}

const planes = [
    {
        repeticiones: 2,
        lagartijas: 5,
        abdominales : 5,
        sentadillas: 5
    },
    {
        repeticiones: 3,
        lagartijas: 10,
        abdominales : 10,
        sentadillas: 10
    },
    {
        repeticiones: 5,
        lagartijas: 15,
        abdominales : 15,
        sentadillas: 15
    }
    
    ]

const menu=`si quieres ver tu plan personalizado y tus datos di "dame mi plan",Si quieres activar tu rutina prueba diciendo 
"activa mi rutina"para empezar a registrar tu progreso, Si quieres ver tu progreso di "cual es mi progreso" para indicarte como ha sido tu progreso en el plan de ejercicios.
Tambien puedes realizar cambios en tu plan de ejercicios diciendo "quiero cambiar mi plan".
Que te gustaria hacer ? `;
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = `Bienvenida y Bienvenido a la skill active life, tu plan de ejercicios personalizado .Si quieres registrarte  puedes decir "guarda mi informacion"  ${menu}`

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Hello World!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const SaveInformationHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SaveInformationIntent';
    },
    async handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const intent = handlerInput.requestEnvelope.request.intent;
        
        const nameg = intent.slots.name.value;
        const weightg = intent.slots.weight.value;
        const heightg = intent.slots.height.value;
        const conditiong = intent.slots.condition.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        const userg = intent.slots.user.value;
        let imcg = (weightg/(heightg*heightg));
        imcg = parseFloat(imcg.toFixed(2));
        let categoryo;
        let plang;
        const uid = dataBase.users.length > 0 ? (dataBase.users[dataBase.users.length-1].id +1) : 1 ;
        
        if (imcg > 0.1 && imcg <= 18.4) {
            categoryo = "Bajo";
            users.planEjercicio.lagartijas= 5;
            users.planEjercicio.sentadillas= 5;
            users.planEjercicio.abdominales= 5;
        } else if (imcg >= 18.5 && imcg <= 24.9) {
            categoryo = "Normal";
            users.planEjercicio.lagartijas= 10;
            users.planEjercicio.sentadillas= 10;
            users.planEjercicio.abdominales= 10;
        } else if (imcg >= 25 && imcg <= 29.9) {
            categoryo = "Sobrepeso";
            users.planEjercicio.lagartijas= 15;
            users.planEjercicio.sentadillas= 15;
            users.planEjercicio.abdominales= 15;
        } else if (imcg >= 30) {
            categoryo = "Obesidad";
            users.planEjercicio.lagartijas= 20;
            users.planEjercicio.sentadillas= 20;
            users.planEjercicio.abdominales= 20;
        }
        
        switch (conditiong) {
            case "bajo":
                users.planEjercicio.repeticiones = 2;
                break;
            case "medio":
                users.planEjercicio.repeticiones = 3;
                break;
            case "alto":
                users.planEjercicio.repeticiones = 5;
                break;
        }
        
        users.id=uid
        users.name=nameg;
        users.weight=weightg;
        users.height=heightg;
        users.user=userg;
        users.progress=0
        users.condition=conditiong
        users.imc.imc=imcg;
        users.imc.category=categoryo;
        
        dataBase.users.push(JSON.parse(JSON.stringify(users)));
        console.log(users.name);
        
        attributesManager.setPersistentAttributes(dataBase);
        console.error("Usuarios: "+ dataBase.users.name);
        await attributesManager.savePersistentAttributes();
        
        const speakOutput = `Listo, añadí al usuario ${nameg} ${menu}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

//Obtener datos
const GetDataIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetDataIntent';
    },
    async handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const attributes = await attributesManager.getPersistentAttributes() || {};
        const intent = handlerInput.requestEnvelope.request.intent;
        
        const userTyped = intent.slots.user.value.toLowerCase();
        
        let speakOutput = '';
        
        if (attributes.users && attributes.users.length > 0) {
            const userss = attributes.users;
            const userFound = userss.find(user => user.user.toLowerCase() === userTyped); // Buscamos el usuario según el userTyped
            
            if (userFound) {
                speakOutput = `Hola ${userFound.name}, tu altura es ${userFound.height} y pesas ${userFound.weight} kg.`
                +` Cuentas con un Indice de Masa Corporal clasificado como ${userFound.imc.category}, actualmente estas en el dia ${userFound.progress} de tu progreso`
                +` Tu plan que se te asigno fue ${userFound.planEjercicio.lagartijas} lagartijas, `
                +`${userFound.planEjercicio.sentadillas} sentadillas y ${userFound.planEjercicio.abdominales} abdominales en ${userFound.planEjercicio.repeticiones} repeticiones.`
                +` ${menu}`;
                if(userFound.progress > 0){
                    speakOutput = `Hola ${userFound.name}.`
                    +` Actualmente estas en el dia ${userFound.progress} de tu progreso`
                    +` El plan que se te asigno fue ${userFound.planEjercicio.lagartijas} lagartijas, `
                    +`${userFound.planEjercicio.sentadillas} sentadillas y ${userFound.planEjercicio.abdominales} abdominales en ${userFound.planEjercicio.repeticiones} repeticiones.`
                    +` ${menu}`;
                }
            } else {
                speakOutput = `El usuario ${userTyped} no existe, si necesitas ayuda puedes decir Alexa ayudame`;
            }
        } else {
            speakOutput = 'No hay usuarios :(.';
        }

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        
    }
};
//Obtener progreso

const GetProgressIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetProgressIntent';
    },
    async handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const attributes = await attributesManager.getPersistentAttributes() || {};
        const intent = handlerInput.requestEnvelope.request.intent;
        
        const userTyped = intent.slots.user.value.toLowerCase();
        
        let speakOutput = '';
        
        if (attributes.users && attributes.users.length > 0) {
            const userss = attributes.users;
            const userFound = userss.find(user => user.user.toLowerCase() === userTyped); // Buscamos el usuario según el userTyped
            
            if (userFound) {
                speakOutput = `Felicidades ${userFound.name}, tu progreso es de ${userFound.progress} dias, `
                +`${menu}`;
            } else {
                speakOutput = `El usuario ${userTyped} no existe, si necesitas ayuda puedes decir Alexa ayudame`;
            }
        } else {
            speakOutput = 'No hay usuarios :(.';
        }

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        
    }
};
//Activar rutina
const ActivateRoutineIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ActivateRoutineIntent';
    },
    async handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const attributes = await attributesManager.getPersistentAttributes() || {};
        const intent = handlerInput.requestEnvelope.request.intent;
        
        const userTyped = intent.slots.user.value.toLowerCase();
        
        let speakOutput = '';
        
        if (attributes.users && attributes.users.length > 0) {
            const userss = attributes.users;
            const userFound = userss.find(user => user.user.toLowerCase() === userTyped); // Buscamos el usuario según el userTyped
            
            if (userFound) {
               
                userFound.progress++;
                
                userss.push(JSON.parse(JSON.stringify(userFound.progress)));
                attributesManager.setPersistentAttributes(attributes);
        
        await attributesManager.savePersistentAttributes();
                speakOutput = `Listo se activo tu rutina! ${userFound.name} tu plan del dia de hoy es el siguiente: ${userFound.planEjercicio.lagartijas} lagartijas, `
                +`${userFound.planEjercicio.sentadillas} sentadillas y ${userFound.planEjercicio.abdominales} abdominales en ${userFound.planEjercicio.repeticiones} repeticiones, si quieres un cronometro di :"empieza mi cronometro". ${menu}`
             
            } else {
                speakOutput = `El usuario ${userTyped} no existe, si necesitas ayuda puedes decir Alexa ayudame`;
            }
        } else {
            speakOutput = 'No hay usuarios :(.';
        }

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        
    }
};
//Actualizar datos 

//UpdateInfoIntent
const UpdateInfoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'UpdateInfoIntent';
    },
    async handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const attributes = await attributesManager.getPersistentAttributes() || {};
        const intent = handlerInput.requestEnvelope.request.intent;
        
        const weight = intent.slots.weight.value;
        const height = intent.slots.height.value;
        const conditiong = intent.slots.condition.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        const userTyped = intent.slots.user.value.toLowerCase();
        let speakOutput = '';
        
         if (attributes.users && attributes.users.length > 0) {
            const userss = attributes.users;
            const userFound = userss.find(user => user.user.toLowerCase() === userTyped); // Buscamos el usuario según el userTyped
            const index = userss.findIndex(object => {
                return object.uid === userFound.uid;
            }) 
                if (userFound) {
                    let imcg = (weight/(height*height));
                    imcg = parseFloat(imcg.toFixed(2));
                    let categoryo;
                    let plang;
            
                    if (imcg > 0.1 && imcg <= 18.4) {
                        categoryo = "Bajo";
                        userFound.planEjercicio.lagartijas= 5;
                        userFound.planEjercicio.sentadillas= 5;
                        userFound.planEjercicio.abdominales= 5;
                    } else if (imcg >= 18.5 && imcg <= 24.9) {
                        categoryo = "Normal";
                        userFound.planEjercicio.lagartijas= 10;
                        userFound.planEjercicio.sentadillas= 10;
                        userFound.planEjercicio.abdominales= 10;
                    } else if (imcg >= 25 && imcg <= 29.9) {
                        categoryo = "Sobrepeso";
                        userFound.planEjercicio.lagartijas= 15;
                        userFound.planEjercicio.sentadillas= 15;
                        userFound.planEjercicio.abdominales= 15;
                    } else if (imcg >= 30) {
                        categoryo = "Obesidad";
                        userFound.planEjercicio.lagartijas= 20;
                        userFound.planEjercicio.sentadillas= 20;
                        userFound.planEjercicio.abdominales= 20;
                    }
                    
                    switch (conditiong) {
                        case "bajo":
                            users.planEjercicio.repeticiones = 2;
                            break;
                        case "medio":
                            users.planEjercicio.repeticiones = 3;
                            break;
                        case "alto":
                            users.planEjercicio.repeticiones = 5;
                            break;
                    }

                        userFound.weight=weight;
                        userFound.height=height;
                        userFound.progress=0
                        userFound.condition=conditiong
                        userFound.imc.imc=imcg;
                        userFound.imc.category=categoryo;
                        
                        
                        userss[index] = userFound;
                        dataBase.users = userss;
                        
                        attributesManager.setPersistentAttributes(dataBase);
                        console.error("Usuarios: "+ dataBase.users.name);
                        await attributesManager.savePersistentAttributes();
                        
                        speakOutput = `El usuario ${userFound.user} ha sido actualizado.  ${menu}` ;
                } else {
                    speakOutput = `El usuario ${userTyped} no existe, si necesitas ayuda puedes decir Alexa ayudame`;
                }
                
                
         } else {
            speakOutput = 'No hay usuarios :(.';
        }
        
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = `${menu}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
// iniciar cronometro
const StartCronometroHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StartCronometro';
    },
    async handle(handlerInput) {
       // Iniciar el cronómetro y almacenar la hora de inicio en sesionAttributes
        const startTime = new Date().getTime();
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.timer = { startTime };
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        
        const speakOutput = 'Cronómetro iniciado. Di "detener cronómetro" cuando quieras parar.';

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        
    }
};
//finalizar cronometro
const StopCronometroIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StopCronometroIntent';
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const { startTime } = sessionAttributes.timer || {};
        
        if (!startTime) {
            return handlerInput.responseBuilder
                .speak('El cronómetro no ha sido iniciado.')
                .getResponse();
        }
        
        const stopTime = new Date().getTime();
        const elapsedSeconds = Math.floor((stopTime - startTime) / 1000);
        const speakOutput = `Cronómetro detenido. Tiempo transcurrido: ${elapsedSeconds} segundos.`;
        
        // Eliminar la hora de inicio del cronómetro de sesionAttributes
        delete sessionAttributes.timer;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
        
    }
};


const GetRecipesIntentHandler ={
        canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetRecipes';
    },
     async handle(handlerInput) {
        let speakOutput = '';

        let dishes = [
                {
                    "name": "pollo",
                    "calories": 222.6,
                    "protein_g": 23.7,
                },
                {
                    "name": "salad",
                    "calories": 23.6,
                    "protein_g": 1.5,
                },
                {
                    "name": "pasta",
                    "calories": 156,
                    "protein_g": 5.7,
                },
                {
                    "name": "rice",
                    "calories": 127.4,
                    "protein_g": 2.7,
                },
                {
                    "name": "fish",
                    "calories": 129.2,
                    "protein_g": 26,
                },
                {
                    "name": "lentils",
                    "calories": 116.2,
                    "protein_g": 8.9,
                }
            ]
                return handlerInput.responseBuilder
                .speak(speakOutput)
                .getResponse();
     }
}

//Get Planes De ejercicios

const GetPlanesImcHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetPlanesImcIntent';
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const intent = handlerInput.requestEnvelope.request.intent;
        const condition = intent.slots.condition.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        let speakOutput = '!';

        switch(condition){
            case "bajo":
                speakOutput = `El plan de ejercicios para esta condición son ${planes[0].repeticiones} repeticiones de ${planes[0].lagartijas} lagartijas, ${planes[0].abdominales} lagartijas, ${planes[0].sentadillas} sentadillas`
                break;
            case "medio":
                speakOutput = `El plan de ejercicios para esta condición son ${planes[1].repeticiones} repeticiones de ${planes[1].lagartijas} lagartijas, ${planes[1].abdominales} lagartijas, ${planes[1].sentadillas} sentadillas`
                break;
            case "alto":
                speakOutput = `El plan de ejercicios para esta condición son ${planes[2].repeticiones} repeticiones de ${planes[2].lagartijas} lagartijas, ${planes[2].abdominales} lagartijas, ${planes[2].sentadillas} sentadillas`
                break;

        }
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};



const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Hasta luego, no olvides regresar y mencionar "activa mi rutina" para seguir con tu progreso!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Lo siento, lo que solicitas no está dentro de mi algoritmo';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelloWorldIntentHandler,
        SaveInformationHandler,
        GetDataIntentHandler,
        GetProgressIntentHandler,
        ActivateRoutineIntentHandler,
        GetRecipesIntentHandler,
        UpdateInfoIntentHandler,
        StartCronometroHandler,
        StopCronometroIntentHandler ,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .withPersistenceAdapter(
        new ddbAdapter.DynamoDbPersistenceAdapter({
            tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
            createTable: false,
            dynamoDBClient: new AWS.DynamoDB({apiVersion: 'latest', region: process.env.DYNAMODB_PERSISTENCE_REGION})
        })
    )
    .lambda();