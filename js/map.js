$(document).ready(function(){
    getData(generalMapFunction)
})

function getData(callback){

    fetch('https://otoplayer.philharmoniedeparis.fr/content/misc/getMapGlobalData.ashx')
    //fetch('./python/data.json')
    .then(response => {
        if (!response.ok) {
        throw new Error('Network response : ' + response.statusText);
        }
        return response.json(); 
    })
    .then(data => {
        callback(data);
        $(".loader").hide()

    })
    .catch(error => {
        console.error('Fetch error. ', error);
    });
}

function generalMapFunction(data){
    console.log(data)



    /* /////////// Fonctions de debuggage /////////// */

    const analyzeData = (sortedData, data) => {
        var output = {}
        output["general"] = {}
        output["general"]["total"] = data.length
        output["general"]["prospect"] = data.filter(item => { return item.prospect == "oui" }).length
        output["general"]["en_cours"] = data.filter(item => { return item.prospect == "non" }).length
        output["general"]["no_loc"] = data.filter(item => { return item.latitude == undefined }).length

        Object.keys(sortedData).map(type => {
            output[type] = []
            output[type]["field"] = []
            output[type]["count"] = {}
            output[type]["count"]["total"] = sortedData[type].data.length
            output[type]["count"]["prospect"] = sortedData[type].data.filter(item => { return item.prospect == "oui" }).length
            output[type]["count"]["en_cours"] = sortedData[type].data.filter(item => { return item.prospect == "non" }).length

            Object.keys(sortedData[type].data[0]).map(field => { output[type].field.push(field) })
            
            
        })
        function download(content, fileName, contentType) {
            var a = document.createElement("a");
            var file = new Blob([content], {type: contentType});
            a.href = URL.createObjectURL(file);
            a.download = fileName;
            a.click();
        }
        //download(JSON.stringify(output), 'dataField.json', 'text/plain');
        console.log(output)
    }

    /* /////////// END Fonctions de debuggage /////////// */

    const config = data[0]
    const actions = data[1]

    // Dataset initial
    window["actions"] = data[1]

    // Extrait la liste des types d'actions
    const typesAction = [...new Set(actions.map(item => item.action))]

    // Tri préliminaire des données par type d'action et ajout des informations de configuration
    const sortedData = createSortedDataObject(actions, typesAction, config) 
    console.log(sortedData)

    analyzeData(sortedData, actions)

    // Comportement responsive des filtres
    responsiveFilter()

    // Création de la carte
    var map = createMap()
    

    // Création des clusters
    createCluster(sortedData, actions, map)

    // Ajoute un écouteur d'événements pour détecter les changements de mode plein écran
    document.addEventListener('fullscreenchange', onFullScreenChange);

    // Création du bouton Réinitialiser les filtres
    createResetButton()

    // Recherche plein texte
    searchBox(actions, typesAction, config, map)

}

function createSortedDataObject(data, typesAction, config) {
    var sortedData = {}
    typesAction.map(action => {
        if (action == undefined) { return }
        sortedData[action] = {
            "name" : config.filter(type => { return type.key == action} )[0].name,
            "id_API" : action,
            "color" : config.filter(type => { return type.key == action} )[0].color,
            "text_color" : config.filter(type => { return type.key == action} )[0].text_color
        }
        sortedData[action]["data"] = data.filter(item => item.action == action)
    })
    return sortedData
}

function createMap(){

    // Variable de sauvegarde des marqueurs
    window["markers"] = []

    // Initialisation de la carte
    const initial_view = { latlng : [0,0], zoom : 2 }
    const map = L.map('mapDG', { 
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: 'topleft'
        },
        worldCopyJump: true,
        scrollWheelZoom: true, 
        minZoom :  2,
        maxZoom: 12,
    }).setView(initial_view.latlng, initial_view.zoom); 

    // Tile PAD
    L.tileLayer('https://tile.jawg.io/jawg-light/{z}/{x}/{y}{r}.png?access-token=YCEYIYWB5ZcUuCYc2XQe9fGjttHukDxdSd2wqzlA7mhBwMK8SXM9h3RGqxtZzuna', {}).addTo(map);
    map.attributionControl.addAttribution("<a href=\"https://www.jawg.io\" target=\"_blank\">&copy; Jawg</a> - <a href=\"https://www.openstreetmap.org\" target=\"_blank\">&copy; OpenStreetMap</a>&nbsp;contributors")
    return map
   

    // Tile 1
    /* L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    return map  */ 
}


function createMarker(sortedData, action) {
    let latitude = parseFloat(action.latitude.replace(",", "."))
    let longitude = parseFloat(action.longitude.replace(",", "."))
    let icon = defineIcon(sortedData, action)
    let popup = createPopup(action, sortedData)
    let marker = L.marker([latitude, longitude], {icon: icon}).bindPopup(popup).openPopup()
    marker["typeAction"] = action.action
    window.markers.push(marker)
    return marker
}

function defineIcon(sortedData, action) {
    if (action.prospect == "oui"){
        var iconPath = `
        <div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25.66 35.26">
                <g>
                <path fill="${sortedData.color}" d="m12.83,0C5.74,0,0,5.74,0,12.83c0,7.08,7.6,15.91,12.83,22.43,5.23-6.52,12.83-15.35,12.83-22.43S19.91,0,12.83,0"/>
                <path fill="${sortedData.text_color}" d="m12.83,9.02c-.4,0-.73.33-.73.73v3.44c0,.4.33.73.73.73,0,0,0,0,0,0,0,0,0,0,0,0h1.89c.4,0,.73-.33.73-.73s-.33-.73-.73-.73h-1.17v-2.71c0-.4-.33-.73-.73-.73Z"/>
                <path fill="${sortedData.text_color}" d="m21.82,12.46h-1.83c-.4,0-.73.33-.73.73s.33.73.73.73h1.07c-.35,3.98-3.53,7.16-7.51,7.51v-1.07c0-.4-.33-.73-.73-.73s-.73.33-.73.73v1.07c-3.98-.35-7.16-3.53-7.51-7.51h1.07c.4,0,.73-.33.73-.73s-.33-.73-.73-.73h-1.07c.35-3.98,3.53-7.16,7.51-7.51v1.07c0,.4.33.73.73.73s.73-.33.73-.73v-1.07c1.02.09,2.02.37,2.93.82l-.64.83,3.59.48-1.38-3.35-.67.87c-1.4-.74-2.97-1.14-4.56-1.14C7.47,3.47,3.11,7.83,3.11,13.19s4.36,9.72,9.72,9.72,9.72-4.36,9.72-9.72c0-.4-.33-.73-.73-.73Z"/>
                </g>
            </svg>
            <div class="icon-shadow"></div>
        </div>`
    }else{
        var iconPath = `
            <div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25.66 35.26" class="icon" fill="${sortedData.color}">
                    <path d="m12.83,0C5.74,0,0,5.74,0,12.83c0,7.08,7.6,15.91,12.83,22.43,5.23-6.52,12.83-15.35,12.83-22.43S19.91,0,12.83,0"/>
                </svg>
                <div class="icon-shadow"></div>
            </div>`
    }
    return L.divIcon({
        html: iconPath,
        iconSize: [30, 30],
        iconAnchor: [15, 42],
        popupAnchor: [0, -0]
    })
}

function createPopup(action, sortedData) {
    let popupContent = document.createElement('div')
    popupContent.setAttribute("class", 'values')

    // Prospect
    if(action.prospect == "oui"){
        let container = document.createElement("div")
        container.setAttribute("class", "prospect")

        let icon = getProspectIcon(sortedData)
        container.appendChild(container.ownerDocument.importNode(icon.documentElement, true))

        let prospect = document.createElement("p")
        prospect.textContent = "Prospect"
        container.appendChild(prospect)

        popupContent.appendChild(container)

        // Séparateur
        let separator = document.createElement("div")
        separator.setAttribute("class", "separator")
        popupContent.appendChild(separator)
    }

    // Type d'action
    let typeAction = document.createElement("h4")
    typeAction.setAttribute("class", "type-action")
    typeAction.textContent = sortedData.name
    popupContent.appendChild(typeAction)

    // Séparateur
    if(action.prospect == "non"){
        let separator = document.createElement("div")
        separator.setAttribute("class", "separator")
        separator.setAttribute("style", `background-color: ${sortedData.color}`)
        popupContent.appendChild(separator)
    }
    
    // Titre Cartel
    let title = document.createElement("h3")
    title.textContent = action.nom
    popupContent.appendChild(title) 

    // Sous titre Cartel
    var subtitleString = action.nom_orchestre || action.nom_projet || action.nom_expo || action.nom_expo_distance
    if (subtitleString){
        let subtitle = document.createElement("h4")
        if(action.action == "Production"){
            subtitleString = "Production : " + subtitleString
        }
        subtitle.textContent = subtitleString
        popupContent.appendChild(subtitle)
    }

    // Type COOP Cartel
    if (action.type_orchestre){
        let type_orchestre = document.createElement("p")
        type_orchestre.innerHTML = `<b>Type d'orchestre : </b>${action.type_orchestre}`
        popupContent.appendChild(type_orchestre)
    }

    if (action.type_cooperation){
        let typeCooperation = document.createElement("p")
        typeCooperation.innerHTML = `<b>Type de coopération : </b>${action.type_cooperation}`
        popupContent.appendChild(typeCooperation)
    }

    // Date Cartel
    if (action.date){
        let date = document.createElement("p")
        let date_debut = simplifyDate(action.date)
        let date_fin = simplifyDate(action.date_fin)
        date.innerHTML = `<b>Date : </b>${date_debut} ${date_fin && (date_fin != date_debut) ? "| " + date_fin : ""}`
        popupContent.appendChild(date)
    }
    function simplifyDate(str){
        if (str){
            return str.replace(/^[0-9]{2}(?!\/[0-9]{4})\/|[0-9]{2}:[0-9]{2}:[0-9]{2}/gm, "")
        }
        return undefined
    }
    // Saison Cartel
    if (action.saison){
        let saison = document.createElement("p")
        saison.innerHTML = `<b>Saison : </b>${action.saison}`
        popupContent.appendChild(saison)
    }

    // Nombre_structures Cartel
    if (action.nombre_structures){
        let text = parseInt(action.nombre_structures) == 1 ? " structure abonnée" : " structures abonnées"
        let nombre_structures = document.createElement("h4")
        nombre_structures.textContent = action.nombre_structures + text
        popupContent.appendChild(nombre_structures)
    }
    
    // Services Cartel
    if (action.services){
        let p = "Accès sur place"
        let a = "Accès à domicile"
        let servicesString = "<b>Services : </b>"
        switch (action.services) {
            case "A": servicesString += a
            break;
            case "P": servicesString += p
            break;
            case "AP": servicesString += a + " & " + p
            break;
            default: servicesString = ""
            break;
        }

        let services = document.createElement("p")
        services.innerHTML = servicesString
        popupContent.appendChild(services)
    }

    // Adresse Cartel 
    let adresseString = [...new Set([
        action.adresse, 
        action.complement_adresse, 
        action.code_postal,
        action.ville,
    ])].filter( Boolean ).join(" ")

    let stateString = [...new Set([
        action.region, 
        action.departement, 
        action.etat, 
        action.pays
    ])].filter( Boolean ).join(", ")

    let adresseElt = document.createElement("address")
    adresseElt.setAttribute("class", "address-action")
    adresseElt.innerHTML = "<b>Adresse : </b>" + adresseString + (adresseString ? ", " : "") + stateString
    popupContent.appendChild(adresseElt)

    // Lien Cartel
    if (action.lien){
        let lien = document.createElement("a")
        lien.setAttribute("class", "btn btn-default btn-externe")
        lien.setAttribute("style", `background-color : ${sortedData.color}; color : ${sortedData.text_color};`)
        lien.setAttribute("href", action.lien)
        lien.setAttribute("title", "Aller sur la page de l'action dans un nouvel onglet")
        lien.setAttribute("target", "_blank")
        lien.textContent = "Informations"
        popupContent.appendChild(lien)
    }

    return popupContent
}

function createCluster(sortedData, actions, map, selectedTypes = ["all_type"], selectedStatut = "all_statut") {

    var parentGroup = L.markerClusterGroup({
        showCoverageOnHover: false
    });

    var subGroups = {}; // Un objet pour stocker les sous-groupes

    Object.keys(sortedData).forEach(typeAction => {
        var arrayMarkers = [];

        sortedData[typeAction].data.forEach(action => {

            if (!action.latitude && !action.longitude) { return }

            let marker = createMarker(sortedData[typeAction], action);
            marker["data"] = action
            arrayMarkers.push(marker);
        });
        // Créer un sous-groupe pour chaque type d'action
        var actionGroup = L.featureGroup.subGroup(parentGroup, arrayMarkers);
        subGroups[typeAction] = actionGroup; // Ajouter le sous-groupe à l'objet subGroups
    });

    
    var overlayMaps = {};    
    Object.keys(subGroups).forEach(typeAction => {
        // Ajouter les sous-groupes au contrôle de couches
        overlayMaps[typeAction] = subGroups[typeAction]
        if (selectedTypes.length == 1 && selectedTypes[0] == "all_type"){
            map.addLayer(subGroups[typeAction]) 
        }
        else if(selectedTypes.includes(typeAction)){
            map.addLayer(subGroups[typeAction])
        }    
    })
    // Créer le contrôle de couches et l'ajouter à la carte
    var layersControl = L.control.layers(null, overlayMaps).addTo(map)

    // Ajouter les boutons radio au fieldset
    //addTypesRadioButton(sortedData, layersControl, subGroups, map, selectedType)
    addTypesCheckBox(sortedData, layersControl, subGroups, map, selectedTypes)
    
    // Ajout conditionnel du fieldset des prospects
    addProspectsRadioButton(actions, subGroups, map, selectedStatut)

    // Initialise results counter
    updateResultsCounter(subGroups, selectedStatut)
   
    
    parentGroup.addTo(map)

    return parentGroup
}

function updateResultsCounter(subGroups, selectedStatut, selectedTypes){

    // Récupère la liste des actions sélectionnées
    if (!selectedTypes){
        var selectedInputs = document.querySelectorAll('input[name="type_action"]:checked') || undefined 
        var selectedTypes = Array.from(selectedInputs)
            .map(input => { return input.value})
            .filter(type => { return type != "all_type"})
    }
    if(!selectedStatut){ 
        selectedStatut = document.querySelector('input[name="statut_action"]:checked').value || undefined 
    }

    var count = 0

    // Si un type est sélectionné et le statut prospect, compte tous les prospects
    if (selectedStatut && selectedStatut  == "prospect"){
        selectedTypes.map(type => {
            count += subGroups[type].getLayers().filter(marker => { return marker.data.prospect == "oui" }).length
        })
    }

    // Si un type est sélectionné et le statut en_cours, compte tous les en_cours
    else if (selectedStatut && selectedStatut  == "en_cours"){
        selectedTypes.map(type => {
            count += subGroups[type].getLayers().filter(marker => { return marker.data.prospect == "non" }).length
        })
    }

    // Compte toutes les actions
    else {
        selectedTypes.map(type => {
            count += subGroups[type].getLayers().length
        })
    }
    $("#results b").text(count)
}

function addTypesCheckBox(sortedData, layersControl, subGroups, map, selectedTypes) {

    // Réinitialisation du conteneur
    $("#type_action_container").empty()

    var parent = document.getElementById("type_action_container");

    // Ajoutez un bouton "Toutes les actions" pour afficher tous les sous-groupes
    var allTypesButton = document.createElement("div")

    var allTypesInput = document.createElement("input");
    allTypesInput.setAttribute("type", "checkbox");
    allTypesInput.setAttribute("id", "all_type");
    allTypesInput.setAttribute("name", "type_action");
    allTypesInput.setAttribute("value", "all_type");
    allTypesInput.setAttribute("data-backColor", "var(--light-blue)");
    allTypesInput.setAttribute("data-color", "var(--deep-blue)");



    allTypesButton.appendChild(allTypesInput)

    let iconInput = createIconInput("all_type", allTypesInput)
    allTypesButton.appendChild(iconInput);

    allTypesInput.checked = selectedTypes.includes("all_type") ? true : false
    typeCheckedStyle(allTypesInput)
    
    var allTypesLabel = document.createElement("label");
    allTypesLabel.setAttribute("for", "all_type");
    allTypesLabel.textContent = "Toutes les actions";

    allTypesButton.appendChild(allTypesLabel)
    parent.appendChild(allTypesButton);

    var checkboxes = [];
    // Ajouter un gestionnaire d'événements pour le bouton "Toutes les actions"
    allTypesInput.addEventListener("change", function () {
        if (this.checked) {

            // Activer tous les sous-groupes
            Object.keys(subGroups).forEach(typeAction => { map.addLayer(subGroups[typeAction]) })

            // Activer toutes les autres cases à cocher
            checkboxes.forEach(checkbox => { 
                checkbox.checked = true 
                typeCheckedStyle(checkbox)
            });
        }
        else{

            // Désactiver tous les sous-groupes
            Object.keys(subGroups).forEach(typeAction => { map.removeLayer(subGroups[typeAction]) })

            // Désactiver toutes les autres cases à cocher
            checkboxes.forEach(checkbox => { 
                checkbox.checked = false
                typeCheckedStyle(checkbox)
            })
        }
        typeCheckedStyle(allTypesInput)
        updateResultsCounter(subGroups);
    });

    Object.keys(sortedData).forEach(action => {
        let container = document.createElement("div");

        let input = document.createElement("input");
        input.setAttribute("type", "checkbox");
        input.setAttribute("data-backColor", sortedData[action].color);
        input.setAttribute("data-color", sortedData[action].text_color);
        input.setAttribute("id", sortedData[action].id_API);
        input.setAttribute("name", "type_action");
        input.setAttribute("value", action);

  

        checkboxes.push(input)

        container.appendChild(input);

        let iconInput = createIconInput(action, input)
        container.appendChild(iconInput);

        input.checked = (selectedTypes.includes(action) || selectedTypes.includes("all_type")) ? true : false
        typeCheckedStyle(input) 

        let label = document.createElement("label");
        label.setAttribute("for", action);
        label.style.left = "6px";
        label.textContent = sortedData[action].name;
        container.appendChild(label);

        parent.appendChild(container);

        // Ajouter un gestionnaire d'événements pour chaque case à cocher
        input.addEventListener("change", function () {
            if (this.checked) {
                map.addLayer(subGroups[action]);
            } else {
                map.removeLayer(subGroups[action]);
                allTypesInput.checked = false
            }
            typeCheckedStyle(input)
            typeCheckedStyle(allTypesInput)

            updateResultsCounter(subGroups);
        });
    });
}
function createIconInput(action, input){
    let backColor = input.getAttribute("data-backColor")
    let color = input.getAttribute("data-color")

    let container = document.createElement("div")
    container.setAttribute("id", `iconType-${action}`)

    let cursor = new DOMParser().parseFromString(`
        <svg class="cursor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 73.53 73.53">
            <rect width="73.53" height="73.53" rx="17.9" ry="17.9"/>
        </svg>`, "text/xml").documentElement
    cursor.setAttribute("style", `fill: ${backColor}; stroke: var(--deep-blue); stroke-width:0px;`)
    container.appendChild(cursor)


    let checkIcon = new DOMParser().parseFromString(`
        <svg class="checkIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 41.3 29.06">
            <line x1="3.5" y1="13.33" x2="15.74" y2="25.56"/>
            <line x1="37.8" y1="3.5" x2="15.74" y2="25.56"/>
        </svg>`, "text/xml").documentElement
    checkIcon.setAttribute("style", `stroke: #fff;`)
    container.appendChild(checkIcon)

    return container
}

function typeCheckedStyle(elt){

    if (!elt.nextElementSibling) {return}

    if (elt && !elt.checked) { 
        elt.nextElementSibling.children[0].setAttribute("style", "fill: #F2F2F2; stroke: #666; stroke-width:1px")
        elt.nextElementSibling.children[1].setAttribute("display", "none")
    }
    else{
        elt.nextElementSibling.children[0].setAttribute("style", `fill: ${elt.getAttribute("data-backColor")}; stroke: #ccc; stroke-width:0px; `)
        elt.nextElementSibling.children[1].setAttribute("display", "block")
    }

}

function checkMarker(marker, subGroups, typeAction, remove = false){
    if (!subGroups[typeAction].hasLayer(marker) && marker.typeAction == typeAction) {
        subGroups[typeAction].addLayer(marker);
    }
    if(remove && (subGroups[typeAction].hasLayer(marker) && marker.typeAction == typeAction)){
        subGroups[typeAction].removeLayer(marker);
    }
}
function addProspectsRadioButton(actions, subGroups, map, selectedStatut) {

    // Réinitialisation du conteneur
    $("#prospect-filter").empty()

    // S'il existe une entrée prospect, créé le fieldset radio button dans le filtre
    if (!window.actions.some(e => e.prospect === "oui")) { return }

    let fieldset = document.createElement("fieldset")
    fieldset.setAttribute("id", "statut_action")

    createField(fieldset, "all_statut", "Toutes les actions", selectedStatut)
    createField(fieldset, "prospects", "Prospects", selectedStatut)
    createField(fieldset, "en_cours", "Actions en cours", selectedStatut)

    let parent = document.getElementById("prospect-filter")
    parent.appendChild(fieldset)
    setSelectedStatut(selectedStatut, actions)

    fieldset.addEventListener("change", function () {
        var selectedStatut = document.querySelector('input[name="statut_action"]:checked').value
        setSelectedStatut(selectedStatut, actions)
    })
    
    function setSelectedStatut(selectedStatut){

        // Filtrer les marqueurs en fonction de la sélection "Statut" et de la sélection du type d'action
        Object.keys(subGroups).forEach(typeAction => {
            
            window.markers.forEach(marker => {
                if(selectedStatut == "all_statut"){
                    checkMarker(marker, subGroups, typeAction)
                }
                if(selectedStatut == "prospects"){
                    var remove = marker.data.prospect == "oui" ? false : true
                    checkMarker(marker, subGroups, typeAction, remove)
                }
                if(selectedStatut == "en_cours"){
                    var remove = marker.data.prospect == "non" ? false : true
                    checkMarker(marker, subGroups, typeAction, remove)
                }  
            })
            updateResultsCounter(subGroups)
        })
        
    }
}

function createField(fieldset, id, text, selectedStatut) {
    let container = document.createElement("div")

    let input = document.createElement("input")
    input.setAttribute("type", "radio")
    input.setAttribute("id", id)
    input.setAttribute("name", "statut_action")
    input.setAttribute("value", id)
    if(selectedStatut == id) {
        input.setAttribute("checked", "checked")
    }
    container.appendChild(input)

    let label = document.createElement("label")
    label.setAttribute("for", id)
    label.style.left = "6px"
    label.textContent = text
    container.appendChild(label)

    if (id == "prospects") {
        let icon = getProspectIcon()
        container.appendChild(container.ownerDocument.importNode(icon.documentElement, true))
    }

    fieldset.appendChild(container)
}

function searchBox(actions, typesAction, config, map) {

    if (!RegExp.escape) {
        RegExp.escape = function(s) {
            return s.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&")
        }
    }
    $('.search-bar').submit(function(e) { e.preventDefault() })
    $('#search').click(function(e) {

        // Récupération des informattions des filtres
        var selectedStatut = document.querySelector('input[name="statut_action"]:checked').value

        var selectedInputs = document.querySelectorAll('input[name="type_action"]:checked') || undefined 
        var selectedTypes = Array.from(selectedInputs)
            .map(input => { return input.value})
            .filter(type => { return type != "all_type"})

        // Réinitialisation de la carte pour intégrer le dataset filtré
        if (map == undefined) { return }
        map.off()
        map.remove()

        // Création de la carte
        map = createMap()

        // Filtrer le dataset
        var filterQuery = filterSearch(actions)
        filteredSortedData = createSortedDataObject(filterQuery.filtered, typesAction, config)

        // Création des nouveaux clusters
        createCluster(filteredSortedData, filterQuery.filtered, map, selectedTypes, selectedStatut) 

        // Ajoute un écouteur d'événements pour détecter les changements de mode plein écran
        document.addEventListener('fullscreenchange', onFullScreenChange);

        // Création du bouton Réinitialiser les filtres
        //createResetButton()

    })

function filterSearch(actions) {

    var searchTerms = document.getElementById("seeker").value.replace(/\s$/gmi, "")
    // Traitement de la recherche avec prise en charge de la recherche exacte ("lorem")
    let queryReg = []
    var regexQuote = new RegExp(/\"(.*?)\"/, 'gm')

    if (regexQuote.test(searchTerms)) {
        queryReg = searchTerms.match(regexQuote).map(q => q.replace(/\"/gm, ''))

    } else {
        searchTerms.toLowerCase().split(' ').map(q => queryReg.push(`(?=.*${q})`))
    }
    //Data filter method
    var filtered = []

    const filterIt = (arr, query) => {
        return arr.filter(obj => Object.keys(obj).some(key => {
            return new RegExp(query, "mgi").test(obj[key])
        }))
    }
    queryReg.map(query => {         
        filtered.push(filterIt(actions, query)) 
    })

    // Prise en charge de la recherche avec mots multiples dans tous les champs de data
    if (queryReg.length > 1) {
        const findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) !== index)
        filtered = findDuplicates(filtered.flat())
    }
    return { "filtered": filtered.flat(), "query": queryReg }
}


    /* 

    
    //accessibilityButton(data, cats)

    $('#search').click(function(e) {

        var catSelected = $("#typeSelection").data("select")
        if (catSelected) {
            data = window[`${catSelected}Data`]
        }
        var filterQuery = filterSearch(data)
        $("#result-msg span")[0].textContent = filterQuery.filtered.length

        if (filterQuery.filtered.length == 0) {
            return
        }

        // Mise à jour des résultats de la carte en supprimant les cluster et les recréant avec le dataset filtré
        var newMarkers = []
        carteAbonnee.eachLayer(layer => { if (layer instanceof L.MarkerClusterGroup) { carteAbonnee.removeLayer(layer) } })
        cats.map(cat => {
            var filterCatItem = []
            filterQuery.filtered.map(item => {
                if (item.type_equipement_ou_lieu.toLowerCase() == cat.type) {
                    filterCatItem.push(item)
                }
            })
            newMarkers.push(window.map_utils.createCluster(cat, filterCatItem, regions))
        })

        // Création de la liste des marqueurs filtrés 

        newMarkers = flatArray(newMarkers.flat().map(cluster => { return cluster.markers }))

        $("#access-button").remove()
        accessibilityButton(filterQuery.filtered)
        createButtonReseaux(filterQuery.filtered)

        // Construction du DOM des résultats
        document.getElementById('searchResults').replaceChildren()
        if (filterQuery.query != `(?=.*)`) {
            carteAbonnee.setView([46.71109, 1.7191036], 6)
            $.each(filterQuery.filtered, function(key, val) {
                var popup = createPopup(val, "isSearch", newMarkers, map)
                document.getElementById('searchResults').appendChild(popup)
            })

            if ($("#resultsLink").length == 0) {
                // If button does not exists, create it
                let resultsLink = document.createElement("a")
                resultsLink.setAttribute("href", "#filter-results")
                resultsLink.setAttribute("id", "resultsLink")
                resultsLink.setAttribute("class", "btn btn-default")
                resultsLink.textContent = "Voir la liste"

                $(".search-bar")[0].insertBefore(resultsLink, document.getElementById("result-msg"))

                $("#noResult-msg").remove()

            }
        }

    }) */

}

function responsiveFilter(){
    // Comportement du bouton de filtres
    $("#open-close-filter").on("click", e => {
        $("#mapDG-filter-container").toggleClass("open")
        $("#mapDG").toggleClass("open")
        $("#open-close-filter").toggleClass("open")
    })
}

function createResetButton() {
    // Création d'un bouton réinitialisant la carte
    let reset_button = document.createElement("button")
    reset_button.id= "reset-button"
    reset_button.setAttribute("class", "btn btn-default")
    reset_button.setAttribute("type", "button")
    reset_button.textContent = "Réinitialiser la carte"
  
    $(reset_button).on("click", e => {
        console.log("reset")
    })
    document.getElementById("mapDG").appendChild(reset_button)
  
  } 

function onFullScreenChange() {
    // Déplacement des éléments du DOM pour afficher les filtres avec l'option plein écran
    var mapElement = document.getElementById('mapDG');
    var filterElement = document.getElementById('mapDG-filter-container');
    var buttonElement = document.getElementById('open-close-filter');
    var parentContainer = document.getElementById('mapDG-container');
  
    // Vérifie si la carte est en mode plein écran
    if (document.fullscreenElement === mapElement) {
        // Si oui, déplace les éléments de filtre en dehors du conteneur de la carte
        mapElement.appendChild(filterElement)
        mapElement.appendChild(buttonElement)
    } else {
        // Si non, remet les éléments de filtre dans le conteneur de la carte
        parentContainer.insertBefore(filterElement, mapElement)
        parentContainer.insertBefore(buttonElement, mapElement)
    }
    $(filterElement).toggleClass("fullscreen-filters")
    $(buttonElement).toggleClass("fullscreen-filters")
}


function normalize_string(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/gm, "_").toLowerCase()
}
function getProspectIcon(sortedData = false){
    var icon = new DOMParser().parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44.74 44.74" fill="${sortedData.text_color}" style="background-color:${sortedData.color}">
            <g>
                <path class="cls-1" d="m22.37,12.78c-.92,0-1.67.75-1.67,1.67v7.92c0,.92.75,1.67,1.67,1.67,0,0,0,0,0,0,0,0,0,0,0,0h4.36c.92,0,1.67-.75,1.67-1.67s-.75-1.67-1.67-1.67h-2.7v-6.25c0-.92-.75-1.67-1.67-1.67Z"/>
                <path class="cls-1" d="m43.07,20.7h-4.22c-.92,0-1.67.75-1.67,1.67s.75,1.67,1.67,1.67h2.47c-.8,9.16-8.12,16.48-17.28,17.28v-2.47c0-.92-.75-1.67-1.67-1.67s-1.67.75-1.67,1.67v2.47c-9.16-.8-16.48-8.12-17.28-17.28h2.47c.92,0,1.67-.75,1.67-1.67s-.75-1.67-1.67-1.67h-2.47C4.22,11.54,11.54,4.22,20.7,3.42v2.47c0,.92.75,1.67,1.67,1.67s1.67-.75,1.67-1.67v-2.47c2.35.21,4.64.85,6.75,1.89l-1.48,1.91,8.26,1.11-3.17-7.71-1.54,2c-3.22-1.71-6.83-2.62-10.5-2.62C10.03,0,0,10.03,0,22.37s10.03,22.37,22.37,22.37,22.37-10.03,22.37-22.37c0-.92-.75-1.67-1.67-1.67Z"/>
            </g>
        </svg>`,
        'application/xml');
    return icon
}

function checkAction(city){
    return window.actions.filter(action => { return action.ville == city})
}
