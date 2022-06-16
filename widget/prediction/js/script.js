// General Variables
var prediction;

// Info Variables
var title;
var duration;

// Summery Variables
var totalOutcomes = 0;
var totalPoints = 0;
var totalUsers = 0;

var template

var settings = {
    websocketURL: "ws://localhost:8080/",
    debug: false,
    text: {
        "stringDefaultTitle": `There is no Prediction running right now!`,
        "stringSummery": `So far nobody has voteted yet`
    },
    animations: {
        clearDelay: 5000
    },
};



window.addEventListener('load', (event) => {
    $('#title').html(settings.text.stringDefaultTitle);
    template = document.querySelector('#outcome');
    connectws();
});

function connectws() {
    if ("WebSocket" in window) {
        ws = new WebSocket(settings.websocketURL);
        bindEvents();
    }
}

function bindEvents() {
    ws.onopen = function() {
        console.debug('Websocket connected');
        ws.send(JSON.stringify({
            "request": "Subscribe",
            "events": {
                "Twitch": [
                    "PredictionCreated",
                    "PredictionUpdated",
                    "PredictionCompleted",
                    "PredictionCanceled",
                    "PredictionLocked"
                ]
            },
            "id": "Predictions"
        }));
    }

    ws.onmessage = function(event) {
        // grab message and parse JSON
        const msg = event.data;
        const data = JSON.parse(msg);

        if (!data.event) {
            return;
        }

        prediction = data.data;

        // check for events to trigger
        switch (data.event.type) {
            case "PredictionCreated":
                CreatePrediction();
                break;
            case "PredictionUpdated":
                UpdatePrediction();
                break;
            case "PredictionLocked":
                // Todo: Add a function here
                break;
            case "PredictionCompleted":
                // Todo: Show Winner and maybe the top winner?
                CompletePrediction(prediction.winningOutcome)
                break;
            case "PredictionCanceled":
                CancelPrediction();
                break;
            default:
                console.log(data.event.type);

        }
    };

    ws.onclose = function() {
        // "connectws" is the function we defined previously
        setTimeout(connectws, 10000);
    };
}


/**
 * Action Controller Functions
 */
function CreatePrediction() {

    title = prediction.title;
    $('#title').html(title);
    $('#summery').html(settings.text.stringSummery);
    duration = prediction.predictionWindow;
    $('#timeleft').css('--timer', duration + "s");

    prediction.outcomes.forEach(outcome => {
        $("#outcomes").append(renderOutcome(outcome));
    });

    $('#timeleft').addClass("animate");
}

function UpdatePrediction() {

    totalPoints = 0;
    totalUsers = 0;
    index = 0;

    prediction.outcomes.forEach(outcome => {
        updateOutcome(outcome);
    });

    updateSummery();
}

function CancelPrediction() {
    // Remove Outcomes and set everything back to default
    $("#outcomes").empty();
    $('#title').html('There is no Prediction running right now!');
    $('#summery').html('');
    $('#timeleft').css('--timer', "0s");
}

function CompletePrediction(outcome) {
    console.debug(outcome);

    ClearPrediction();
}


/**
 *
 * @param {int} index
 * @param {object} outcome
 * @returns
 */
function renderOutcome(outcome) {

    // Get template and populate
    var tpl = template;

    const pattern = /{{\s*(\w+?)\s*}}/g; // {property}
    return tpl.innerHTML.replace(pattern, (_, token) => outcome[token] || '');
}

/**
 *
 * @param {int} index
 * @param {object} outcome
 */
function updateOutcome(outcome) {

    totalPoints += outcome.total_points;
    totalUsers += outcome.total_users;
    $(`#outcome-${index} .points`).html(outcome.total_points);
    $(`#outcome-${index} .beter`).html(outcome.total_users);
}

/**
 *
 */
function updateSummery() {
    // Update % based Values
    prediction.outcomes.forEach(outcome => {
        updatePercent(outcome);
    });
    $('#summery').html(`${totalPoints} points have been bet by ${totalUsers} viewers so far`);
}
/**
 *
 * @param {int} index
 * @param {object} outcome
 */
function updatePercent(outcome) {

    var top = { points: 0, name: "" };

    if (outcome.top_predictors) {
        outcome.top_predictors.forEach(predictors => {
            if (top.points < predictors.points) {
                top.points = predictors.points;
                top.name = predictors.user_display_name;
            }
        });
    }


    let perc = percentage(outcome.total_points, totalPoints);
    $(`#${outcome.id} .percent`).html(`${perc}%`);
    $(`#${outcome.id} .percent-bar`).css('--percent', perc + "%");

    $(`#${outcome.id} .points`).html(`${outcome.total_points}`);
    $(`#${outcome.id} .beter`).html(`${outcome.total_users}`);
    $(`#${outcome.id} .top`).html(`${top.name}`);
}

/**
 * Readys widget for the next Prediction
 */
function ClearPrediction() {
    setTimeout(function() {
        $("#outcomes").empty();
        $('#title').html(settings.text.stringDefaultTitle);
        $('#summery').html('');
    }, settings.animations.clearDelay);
}

/**
 *
 * @param {int} partialValue
 * @param {int} totalValue
 * @returns int
 */
function percentage(partialValue, totalValue = 0) {
    return Math.round((100 * partialValue) / totalValue);
}