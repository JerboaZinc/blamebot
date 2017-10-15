
//blamebot for webtask

//secrets can be added from the spanner icon in top left of edit window

var express = require('express');
var Webtask = require('webtask-tools');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();

var MAX_LEN=50; // max number of users/problems to retain per channel
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
var phrases = [
    "All the signs point to {}",
    "It was {}, without a shadow of a doubt",
    "The weight of evidence suggests {}",
    "It was {} although this will be officially denied",
    "More than likely {} had a hand in it",
    "There is mounting evidence that {} was responsible",
    "Do you even need to ask? Of course it was {}",
    "The official enquiry found {} was responsible but the findings were suppressed",
    "It was definitely {} but its doubtful they will admit it",
    "The balance of probabilities suggests {} is most likely culpable",
    "Yo dawg! {} is totally down for that",
    "The authorities interviewed {} but the case didnt go to court"
];
// a few hard-coded reasons to get started.
var starting_reasons = [
    "global warming",
    "DPRK missile tests",
    "brexit",
    "rising house prices",
    "chinese hackers",
    "the national debt",
    "south australian windfarms",
    "Romeo and Juliet",
    "not moonlight, not good times, but definitely boogie",
    "Russian facebook trolls"

];

//post from slack handled here
app.post('/', function (req, res) {
    console.log(req.body);
        //https://webtask.io/docs/editor/secrets
    var secrets = req.webtaskContext.secrets;
    //https://webtask.io/docs/storage
    var storage = req.webtaskContext.storage;
    var params = req.body;
    
    //check slack token is correct
    if (params.token != secrets.slack_token){
        return res.send("Understandable-have a nice day");
    }
    res.setHeader('Content-Type', 'application/json');

    // make a space-seperated list of channel names in the forbidden env variable
    // to prevent responses in those channels
    var forbidden_channels = ["general"];
    if (secrets.forbidden) {
        forbidden_channels = secrets.forbidden.split(/\s+/);
    }
    if (forbidden_channels.indexOf(params.channel_name) >= 0) {
        params.cant_speak = "<#" + params.channel_id + "|" + params.channel_name + ">";
        slack_resp = {
            "response_type": "ephemeral",
            "text": "Regrettably Blamebot is not free to speak in <#" + params.channel_id + "|" + params.channel_name + ">"
        };
        
        return res.send(slack_resp);
    }
    if (params.text.search(/\#\!report/i) >= 0) {
        storage.get(function (error, data) {
            if (error) {
                console.log(error);
                return res.send({'text':'Blamebot isnt feeling so good just now','response_type':'ephemeral'});
            
            }
            data=data || {"channel":{}};
            if(params.channel_name in data.channel){
                return res.send({
                    'text':'Blamebot has solved '+data.channel[params.channel_name].problems.length+' problems for '
                            + data.channel[params.channel_name].users.length +' users',
                    'attachments':[{'text':JSON.stringify(data.channel[params.channel_name])}],
                    'response_type':'ephemeral'});
            } else {
                return res.send({'text':'Blamebot hasnt been used in #'+params.channel_name+" yet",'response_type':'ephemeral'});
            }
        });
        return;
    }
    if (params.text.search(/\#\!reset/i) >= 0) {
        storage.get(function (error, data) {
            if (error) {
                console.log(error);
                return res.send({'text':'Blamebot isnt feeling so good just now','response_type':'ephemeral'});
            
            }
            data=data || {"channel":{}};
            if (params.channel_name in data.channel) {

                res.send({
                    'text': 'Removed ' + data.channel[params.channel_name].problems.length + ' problems and '
                    + data.channel[params.channel_name].users.length + ' users from #' + params.channel_name
                    , 'response_type': 'ephemeral'
                });
                data.channel[params.channel_name] = { "users": [], "problems": [] };
                storage.set(data, function (error) {
                    if (error) console.log(error);
                // ...
            });
            }
        });
        return;
    }
    var problem = "";
    var n = params.text.search(/for\s+/i);
    if (n >= 0) {
        problem = params.text.substring(n + 3, params.text.length);
        // remove leading and trailing spaces
        problem = problem.replace(/^\s+|\s+$/gm, '');
        // remove non-alpha characters
        problem = problem.replace(/[^a-zA-Z0-9 ]/gm, '');
    }
    if (n < 0 || problem.length < 3) {
        // problem is missing or too short.
        slack_resp = {
            "response_type": "ephemeral",
            "text": "Blamebot is not telepathic. Please ask blamebot proper question!",
            "attachments": [{"text": "eg Who is to blame for global warming?"}]
        };
        return res.send(slack_resp);
    }
    if (params.text.search(/blamebot/i) >= 0 ) {
        // deflect blame from blamebot
        var excuses=[
            "In a very real sense you are responsible for blamebot",
            "Those who seek to blame others may well be blamed themselves",
            "Blamebot merely makes plain the unconcious yearings of the masses",
            "Let those without sin be first to cast a stone"
        ];
        slack_resp = {
            "response_type": "in_channel",
            "text": excuses[Math.floor(Math.random() * excuses.length)]
        };
        return res.send(slack_resp);
    }
    // at this point terminate the request and POST later    
    res.send({"response_type": "ephemeral",
            "text":"Allow me to go find who is to blame for "+problem});
    params.problem=problem;

    
    storage.get(function (error, data) {
        if (error) {
            console.log(error);
            //return res.send({'text':'Blamebot isnt feeling so good just now','response_type':'ephemeral'});

        }
        data = data || { 'channel':{} };
        new_data=false;
        reasons=[];
        user_name="<@"+params.user_name+">";
        if (! data.channel) {data.channel={} }
        //load previous data, pad out with static reasons if necessary
        if (!(params.channel_name in data.channel)){
            data.channel[params.channel_name]={"users":[],"problems":[]};
            new_data=true;
            reasons=starting_reasons;
        } else {
            //all previous users and all previous problems become possible reasons.
            reasons = data.channel[params.channel_name].users.concat(data.channel[params.channel_name].problems);
            if (reasons.length < starting_reasons.length) {
                reasons = reasons.concat(starting_reasons);
            }
        }
        var phrase = phrases[Math.floor(Math.random() * phrases.length)];
        var reason = reasons[Math.floor(Math.random() * reasons.length)];
        if (reason == user_name || reason==params.problem) {
            phrase = "Perhaps you should examine your own conscience in this case?";
        }

        slack_resp = {
            "attachments":[{
                "title":user_name+" asks Blamebot",
                "text": params.text},
                {"title":"Blamebot responds",
                "text": phrase.replace("{}", reason), 
            }],
            "response_type": "in_channel",
            "parse": "full"
        };
        console.log("blaming"+JSON.stringify(slack_resp));
        // Set up the options for the HTTP request.
        var options = {
            // Use the Webhook URL from the Slack Incoming Webhooks integration.
            uri: params.response_url, 
            method: 'POST',
            // Slack expects a JSON payload with a "text" property.
            json: slack_resp
        };

        // Make the POST request to the Slack incoming webhook.
        request(options, function (error, response, body) {
            // Pass error back to client if request endpoint can't be reached.
            if (error) {
                console.log(error);
            }
            console.log("POSTed OK");
        });
    
        // add user and problem to existing set
        if (data.channel[params.channel_name].users.indexOf(user_name)<0) {
            console.log(data.channel[params.channel_name].users);
            l=data.channel[params.channel_name].users.push(user_name);
            console.log('adding user '+user_name);
            new_data=true;
            if (l>MAX_LEN) {
                shift(data.channel[params.channel_name].users);
            }
        }
        if (data.channel[params.channel_name].problems.indexOf(params.problem)<0) {
            l=data.channel[params.channel_name].problems.push(params.problem);
            console.log('adding problem '+params.problem);
            new_data=true;
            if (l>MAX_LEN) {
                shift(data.channel[params.channel_name].problems);
            }
        }
        if (new_data) {
            storage.set(data, function (error) {
                if (error) console.log(error);
                // ...
            });
        }
    });
});

//visiting above url in browser is handled by get
app.get('/', function (req, res) {
    var secrets = req.webtaskContext.secrets;
    if (secrets.slack_token != req.query.token) {
        return res.send('OK');
    }
    var storage = req.webtaskContext.storage;
    storage.get(function (error, data) {
        if (error) {
            console.log(error);
            return res.send(error);

        }
        data = data || { counter: 0 };
        data.counter += 1;
        storage.set(data, function (error) {
            if (error) console.log(error);
            // ...
        });
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
    });
});
module.exports = Webtask.fromExpress(app);
