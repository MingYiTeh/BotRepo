// Reference the packages we require so that we can use them in creating the bot
var restify = require('restify');
var builder = require('botbuilder');
var rp = require('request-promise');

// Static variables that we can use anywhere in server.js
var BINGSEARCHKEY = 'b6692d8a9c424bd98148f7a0e39ca283';

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
// Listen for any activity on port 3978 of our local server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID || '1fd56749-cd61-4278-8b9a-2a5228692567',
    appPassword: process.env.MICROSOFT_APP_PASSWORD || '6ZRWXPtQ9GSpyk7oP6b36Y1'
});
var bot = new builder.UniversalBot(connector);
// If a Post request is made to /api/messages on port 3978 of our local server, then we pass it to the bot connector to handle
server.post('/api/messages', connector.listen());

var luisRecognizer = new builder.LuisRecognizer('https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/e270ce85-d2e6-4de9-85f3-248035c54d91?subscription-key=519975260d36455d9b5dd0118cdb7a97');
var intentDialog = new builder.IntentDialog({recognizers: [luisRecognizer]});
bot.dialog('/', intentDialog);

intentDialog.matches(/\b(hi|hello|hey|howdy)\b/i, '/sayHi')
    .matches('getNews', '/topNews')
    .matches('analyseImage', '/analyseImage')
    .onDefault(builder.DialogAction.send("Sorry, I didn't understand what you said."));

bot.dialog('/sayHi', function(session) {
    session.send('Hi there!  Try saying things like "Get news in Toyko"');
    session.endDialog();
});

bot.dialog('/topNews', [
    function (session){
        // Ask the user which category they would like
        // Choices are separated by |
        builder.Prompts.choice(session, "Which category would you like?", "Technology|Science|Sports|Business|Entertainment|Politics|Health|World|(quit)");
    }, function (session, results, next){
        // The user chose a category
        if (results.response && results.response.entity !== '(quit)') {
           //Show user that we're processing their request by sending the typing indicator
            session.sendTyping();
            // Build the url we'll be calling to get top news
            var url = "https://api.cognitive.microsoft.com/bing/v5.0/news/?" 
                + "category=" + results.response.entity + "&count=10&mkt=en-US&originalImg=true";
            // Build options for the request
            var options = {
                uri: url,
                headers: {
                    'Ocp-Apim-Subscription-Key': BINGSEARCHKEY
                },
                json: true // Returns the response in json
            }
                    //Make the call
            rp(options).then(function (body){
                // The request is successful
                sendTopNews(session, results, body);
            }).catch(function (err){
                // An error occurred and the request failed
                console.log(err.message);
                session.send("Argh, something went wrong. :( Try again?");
            }).finally(function () {
                // This is executed at the end, regardless of whether the request is successful or not
                session.endDialog();
            });
        } else {
            // The user choses to quit
            session.endDialog("Ok. Mission Aborted.");
        }
    }
]);

// This function processes the results from the API call to category news and sends it as cards
function sendTopNews(session, results, body){
    session.send("Top news in " + results.response.entity + ": ");
    //Show user that we're processing by sending the typing indicator
    session.sendTyping();
    // The value property in body contains an array of all the returned articles
    var allArticles = body.value;
    var cards = [];
    // Iterate through all 10 articles returned by the API
    for (var i = 0; i < 10; i++){
        var article = allArticles[i];
        // Create a card for the article and add it to the list of cards we want to send
        cards.push(new builder.HeroCard(session)
            .title(article.name)
            .subtitle(article.datePublished)
            .images([
                //handle if thumbnail is empty
                builder.CardImage.create(session, article.image.contentUrl)
            ])
            .buttons([
                // Pressing this button opens a url to the actual article
                builder.CardAction.openUrl(session, article.url, "Full article")
            ]));
    }
    var msg = new builder.Message(session)
        .textFormat(builder.TextFormat.xml)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(cards);
    session.send(msg);
}

var IMAGEANALYSEKEY = '6b7f1d64bb254d07a6dd96df18ac4146'; 

bot.dialog('/analyseImage', [
        function (session){
        // Ask the user which category they would like
        // Choices are separated by |
        builder.Prompts.text(session, "Send me the link please.");
},function (session, results, next){
    if (results.response && results.response.entity !== 'end') {
        // The user returns an image URL
           //Show user that we're processing their request by sending the typing indicator
            //console.log("hello"+results.response);
            session.sendTyping();
            // Build the url we'll be calling to get cognitive vision
            var url = "https://westus.api.cognitive.microsoft.com/vision/v1.0/describe?maxCandidates=1";
            // Build options for the request
            var options = {
            method: 'POST', // thie API call is a post request
            uri: url,
            headers: {
                'Ocp-Apim-Subscription-Key': IMAGEANALYSEKEY,
                'Content-Type': 'application/json'
            },
            body: {
                url: results.response
            },
            json: true
        }
                    //Make the call
            rp(options).then(function (body){
                // The request is successful
                //doSomething
                sendImageDescription(session, results, body);
            }).catch(function (err){
                // An error occurred and the request failed
                console.log(err.message);
                session.send("Argh, something went wrong. :( Try again?");
            }).finally(function () {
                // This is executed at the end, regardless of whether the request is successful or not
                session.endDialog();
            });
        } else {
            // The user choses to quit
            session.endDialog("Ok. Mission Aborted.");
        }
    }
]);

// This function processes the results from the API call to category news and sends it as cards
function sendImageDescription(session, results, body){
    session.send("Analyzed image");
    //Show user that we're processing by sending the typing indicator
    session.sendTyping();
    session.send(body.description.captions[0]);
}



//=========================================================
// Bots Dialogs
//=========================================================

// This is called the root dialog. It is the first point of entry for any message the bot receives
/*8bot.dialog('/', function (session) {
    // Send 'hello world' to the user
    session.send("Hello World");
});*/