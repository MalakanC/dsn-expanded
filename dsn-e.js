dsnColorSets = {}

class mod {

    static get modName() {
        return "Dice so Nice - Expanded"
    };

    static get modId() {
        return "dsn-expanded"
    };

    static get modPath() {
        return "modules/" + this.modId
    };
}

/* -------------------------------------------------------------------------- */
/*                                 Functions                                  */
/* -------------------------------------------------------------------------- */

function addDiceSetButton(app, array){
        const diceSetButton={
            class:"EffectTransfer",
            icon:"fas fa-dice-d20", //https://fontawesome.com/v5.15/icons
            label: "Dice Set",
            onclick: () => DiceSetButtonClick(app.object)
        }
        array.unshift(diceSetButton)
}

function DiceSetButtonClick(appObj){
    
    // console.log("appObj", appObj.getFlag("dsn-expanded", "DiceSet"))
    // console.log("appObj", appObj)

    // Get available sets from 'Dice So Nice'
    let availableDiceSets = game.user.getFlag("dice-so-nice", "saves")

    // create dialog window elements
    
    console.log("availableDiceSets", availableDiceSets)

    if(jQuery.isEmptyObject(availableDiceSets)){
        console.log("Here")
        // No sets found - tell how to create them
        var dialogContent = 'No dice sets found.' // Save your sets within Dice So Nice "Backup & Restore" tab.'

    }else{
        console.log("There")
        // Sets found - create select element and populate

        var dialogContent = document.createElement("select");
        dialogContent.setAttribute("id", "diceSetSelector");
        for(set in availableDiceSets){
            var el = document.createElement("option");
            el.textContent = set;
            el.value = set;
            el.id = set
            dialogContent.appendChild(el);
        }

        console.log(dialogContent)

        // See if set already exists for item in order to set as current selected option

        console.log(appObj.getFlag("dsn-expanded", "DiceSet"))

        if (appObj.getFlag("dsn-expanded", "DiceSet") != undefined){

            dialogContent.getElementById(appObj.getFlag("dsn-expanded", "DiceSet")).selected = true
        
        } else {

            // Add "option" that says to select one.
            var el = document.createElement("option");
            // el.setAttribute("disabled", "disabled")
            el.textContent = "None";
            el.value = -1
            dialogContent.prepend(el);
        }

        dialogContent = dialogContent.outerHTML

    }

    console.log("dialogContent", dialogContent)

    // Create Dialog

    const myDialog = new Dialog({
        
        // icons: https://fontawesome.com/v5.15/icons

        title: "Select your dice set",
        content: dialogContent,
        buttons: {
            button1: {
                label: "Save",
                callback: () => updateDiceSet(appObj.uuid, document.getElementById("diceSetSelector").value),
                icon: `<i class="fas fa-save"></i>`
            },
            button2: {
                label: "Remove",
                callback: () => updateDiceSet(appObj.uuid, -1),
                icon: `<i class="fas fa-trash-alt"></i>`
            },
            button3: {
                label: "Cancel",
                callback: () => {},
                icon: `<i class="fas fa-times"></i>`
            }
      }
    }).render(true);

}

async function updateDiceSet(uuid,updateValue){

    const thisDoc = await fromUuid(uuid)

    if (updateValue != -1){
        //set the flag
        thisDoc.setFlag('dsn-expanded', 'DiceSet', document.getElementById("diceSetSelector").value)

    } else {
        // remove the flag
        thisDoc.unsetFlag('dsn-expanded', 'DiceSet')
    }

}

function setMyDice(set, diceSetData){
    appearance = {}

    // Create dictionary for translating between saved settings vs applying settings (DSN)
    var dict =  {"colorset":"colorset","labelColor":"foreground","diceColor":"background","outlineColor":"outline","edgeColor":"edge","texture":"texture","material":"material","font":"font","system":"system"}

    
    if (diceSetData.appearance.hasOwnProperty('d' + String(set.faces))){
        // If the die has a unique colour
        for (const [key, value] of Object.entries(diceSetData.appearance['d' + String(set.faces)])) {
            appearance[dict[key]] = String(value)
        }

    } else {
        // Global appearance as no overrides specified
        for (const [key, value] of Object.entries(diceSetData.appearance.global)) {
            appearance[dict[key]] = String(value)
        }
    }

    if (appearance.colorset != "custom"){
        
        let rndBackgroundNumber = Math.floor(Math.random() * dsnColorSets[appearance.colorset].background.length)

        appearance["foreground"] = dsnColorSets[appearance.colorset].foreground;
        appearance["background"] = dsnColorSets[appearance.colorset].background[rndBackgroundNumber]
        appearance["outline"] = dsnColorSets[appearance.colorset].outline;

        // Edge isn't often specified
        if(dsnColorSets[appearance.colorset].hasOwnProperty("edge")){
            appearance["edge"] = dsnColorSets[appearance.colorset].edge;
        } else {
            appearance["edge"] = ""
        }
    }
    return appearance
}

/* -------------------------------------------------------------------------- */
/*                                    Hooks                                   */
/* -------------------------------------------------------------------------- */

Hooks.on('ready', async () => {

    // For referncing dice colours from sets.
    const {COLORSETS} = await import('/modules/dice-so-nice/DiceColors.js');
    dsnColorSets = COLORSETS
})

Hooks.on('diceSoNiceRollStart', async (messageId, context) => {

    // Get document
    let msg = game.messages.get(messageId);

    try {
        // Any way to tell at this point the roll's source document type? item vs roll table vs actor?
        let actorId = msg.data.speaker.actor;
        let itemId = msg.data.flags.dnd5e.roll.itemId;   // Only works for items in dndn5e (for now)
        var thisDoc = game.actors.get(actorId).items.get(itemId)
    } catch (error) {
        // The roll is not supported.
        return
    }

    // check if a diceSet is present within flags, otherwise stop
    diceSetName = thisDoc.getFlag('dsn-expanded', 'DiceSet')

    if(diceSetName == undefined){return}

    // get DiceSetData from 'Dice So Nice!'

    diceSetData = game.user.getFlag("dice-so-nice", "saves")[diceSetName]

    // IF diceSetName isn't available any more.
    if (diceSetData == null){
        console.log(mod.modId, "| Dice set not found within 'Dice So Nice!'")
        return
    }

    // For each die, set appearance from saved diceSetData
    context.roll.dice.forEach(function(set, i) {
        context.roll.dice[i].options.appearance = setMyDice(set, diceSetData)
    })
});

Hooks.on("getItemSheetHeaderButtons",addDiceSetButton)