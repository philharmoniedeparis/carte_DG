/**
 * Documentation for map.js
 *
 * This file contains the code for creating an interactive map using Leaflet
 * and its plugins: markerCluster, FullScreen, and subGroup.
 */

$(document).ready(function(){
    getData(generalMapFunction)
})

/**
 * Réupère les données des marqueurs de la carte et de configuration
 * @param {function} callback - callback éxécuté une fois le chargement des données effectué
 */
function getData(callback){

    // Récupère le paramétre private dans l'url

    let urlParams = new URLSearchParams(window.location.search)
    var is_private = "";
    if(urlParams.has('private') && urlParams.get('private') == "true"){
        is_private = "?private=" + urlParams.get('private')
    }

    fetch(`https://otoplayer.philharmoniedeparis.fr/content/misc/getMapGlobalData.ashx${is_private}`)
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

/**
 * Fonction générale de génération de la carte
 * @param {Object} data - Dataset de la carte
 */
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

    // Création de la carte
    var map = createMap()

    // Comportement responsive des filtres
    responsiveFilter(map)

    // Création des clusters
    createCluster(sortedData, actions, map, typesAction)

    // Ajoute un écouteur d'événements pour détecter les changements de mode plein écran
    document.addEventListener('fullscreenchange', onFullScreenChange);

    // Création du bouton Réinitialiser les filtres
    createResetButton(map)

    // Recherche plein texte
    searchBox(actions, typesAction, config, map, sortedData)

    responsiveMap()

}

/**
 * Fonction de tri et de calcul statistique des données
 * @param {Object} data - Dataset des actions
 * @param {array} typesAction - array of string des types d'actions
 * @param {Object} config - Informations de configuration
 */
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

/**
 * Fonction de création de la carte
 */
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

    L.tileLayer('https://tile.jawg.io/jawg-light/{z}/{x}/{y}{r}.png?access-token=YCEYIYWB5ZcUuCYc2XQe9fGjttHukDxdSd2wqzlA7mhBwMK8SXM9h3RGqxtZzuna', {}).addTo(map);
    map.attributionControl.addAttribution("<a href=\"https://www.jawg.io\" target=\"_blank\">&copy; Jawg</a> - <a href=\"https://www.openstreetmap.org\" target=\"_blank\">&copy; OpenStreetMap</a>&nbsp;contributors")
    
    return map
   
}

/**
 * Fonction de création des marqueurs
 * @param {Object} sortedData - Données triées issues de createSortedDataObject
 * @param {Object} action - action du dataset
 */
function createMarker(sortedData, action) {
    let latitude = parseFloat(action.latitude.replace(",", "."))
    let longitude = parseFloat(action.longitude.replace(",", "."))
    let icon = defineIcon(sortedData, action)
    let popup = createPopup(action, sortedData)

    let marker = L.marker([latitude, longitude], {icon: icon}).bindPopup(popup, {maxWidth : 340}).openPopup()
    
    marker["typeAction"] = action.action
    window.markers.push(marker)
    return marker
}

/**
 * Fonction de création de l'icone du marqueur
 * @param {Object} sortedData - Données triées issues de createSortedDataObject
 * @param {Object} action - action du dataset
 */
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

/**
 * Fponction de création de la popup du marqueur
 * @param {Object} sortedData - Données triées issues de createSortedDataObject
 * @param {Object} action - action du dataset
 */
function createPopup(action, sortedData) {
    let popupContent = document.createElement('div')
    popupContent.setAttribute("class", 'values')

    // Header
    let container = document.createElement("div")
    container.setAttribute("class", "prospect")

    // Type d'action
    let typeAction = document.createElement("p")
    typeAction.setAttribute("class", "type-action")
    typeAction.textContent = sortedData.name

    // Séparateur
    let separator = document.createElement("div")
    separator.setAttribute("class", "separator")
    popupContent.appendChild(separator)

    if(action.prospect == "oui"){
        var icon = getProspectIcon(sortedData)
        typeAction.textContent += " - Prospect"
    }
    else{
        var icon = new DOMParser().parseFromString(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44.74 44.74" style="background-color:${sortedData.color}"></svg>`,
            'application/xml');
    }
    
    container.appendChild(container.ownerDocument.importNode(icon.documentElement, true))
    container.appendChild(typeAction)
    popupContent.appendChild(container)

    popupContent.appendChild(separator)

    
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
    let adresse = [...new Set([
        action.ville, 
        action.pays
    ])].filter( Boolean ).join(", ")

    let adresseElt = document.createElement("address")
    adresseElt.setAttribute("class", "address-action")
    adresseElt.textContent = adresse
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
    var popup = L.responsivePopup().setContent(popupContent)
    return popup
}

/**
 * Fonction de simplification des dates du dataset
 * @param {string} str - Date issue de l'action
 */
function simplifyDate(str){
    if (str){
        return str.replace(/^[0-9]{2}(?!\/[0-9]{4})\/|[0-9]{2}:[0-9]{2}:[0-9]{2}/gm, "")
    }
    return undefined
}

/**
 * Fonction de création du cluster contenant les marqueurs
 * @param {Object} sortedData - Données triées issues de createSortedDataObject
 * @param {Object} action - action du dataset
 * @param {Object} map - Variable contenant l'objet carte
 * @param {Object} selectedTypes Variable contenant les types sélectionnés
 * @param {Object} selectedStatut Variable contenant le statut sélectionné
 */
function createCluster(sortedData, actions, map, typesAction, selectedTypes = ["all_type"], selectedStatut = "all_statut") {
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
        subGroups[typeAction]["color"] = sortedData[typeAction].color; 
        subGroups[typeAction]["text_color"] = sortedData[typeAction].text_color; 
        subGroups[typeAction]["name"] = sortedData[typeAction].name; 
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
    L.control.layers(null, overlayMaps).addTo(map)

    // Ajouter les boutons radio au fieldset
    addTypesCheckBox(sortedData, subGroups, map, selectedTypes, typesAction)
    
    // Ajout conditionnel du fieldset des prospects
    addProspectsRadioButton(actions, subGroups, map, selectedStatut)

    // Initialise results counter
    updateResultsCounter(subGroups, selectedStatut)
   
    
    parentGroup.addTo(map)
    window["parentGroup"] = parentGroup
}

/**
 * Fonction de mise à jour du compteur d'action
 * @param {Object} subGroups Sous
 * @param {Object} selectedStatut Variable contenant le statut sélectionné
 * @param {Object} selectedTypes Variable contenant les types sélectionnés
 */
function updateResultsCounter(subGroups, selectedStatut, selectedTypes){

    // Récupère la liste des actions sélectionnées
    if (!selectedTypes){
        var selectedInputs = document.querySelectorAll('input[name="type_action"]:checked') || undefined 
        var selectedTypes = Array.from(selectedInputs)
            .map(input => { return input.value})
            .filter(typeAction => { return typeAction != "all_type"})
    }
    if(!selectedStatut){ 
        var statut = document.querySelector('input[name="statut_action"]:checked')
        selectedStatut = statut ? document.querySelector('input[name="statut_action"]:checked').value : undefined
    }

    var count = 0

    // Si un type est sélectionné et le statut prospect, compte tous les prospects
    if (selectedStatut && selectedStatut  == "prospects"){
        
        selectedTypes.map(typeAction => {
            count += subGroups[typeAction].getLayers().filter(marker => { return marker.data.prospect == "oui" }).length
        })
        var countProspects = count
    }

    // Si un type est sélectionné et le statut en_cours, compte tous les en_cours
    else if (selectedStatut && selectedStatut  == "en_cours"){
        selectedTypes.map(typeAction => {
            count += subGroups[typeAction].getLayers().filter(marker => { return marker.data.prospect == "non" }).length
        })
        var countEnCours = count
    }

    // Compte toutes les actions
    else {
        selectedTypes.map(typeAction => {
            count += subGroups[typeAction].getLayers().length
        })
    }
    $("#results b").text(count)
    disableNoResult(subGroups)
    accessibilityButton(subGroups)
}

/**
 * Fonction désactivant l'option du filtre de type lorsqu'aucun résultat n'est présent sur la carte
 * @param {Object}subGroups - Variable contenant les sous-groupes du cluster
 */
function disableNoResult(subGroups){
    
    Object.keys(subGroups).forEach(typeAction => {
        var inputType = document.querySelector(`input[name="type_action"][value="${typeAction}"]`)        

        // Désactive les types sans marqueurs
        if(subGroups[typeAction].getLayers().length == 0){
            inputType.setAttribute("disabled", "")
            inputType.checked = false
        }
        else{
            inputType.removeAttribute("disabled")
            
        }
    })        
}

/**
 * Fonction ajoutant les types d'actions disponibles
 * @param {Object} sortedData - Données triées issues de createSortedDataObject
 * @param {Object}subGroups - Variable contenant les sous-groupes du cluster
 * @param {Object} map - Variable contenant l'objet carte
 * @param {Object} selectedTypes Variable contenant les types sélectionnés
 */
function addTypesCheckBox(sortedData, subGroups, map, selectedTypes, typesAction) {
    if (!selectedTypes.length || selectedTypes.length == typesAction.length ){
        selectedTypes = ["all_type"]
    }

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

    allTypesInput.checked = selectedTypes.includes("all_type") ? true : false

    var allTypesLabel = document.createElement("label");
    allTypesLabel.setAttribute("for", "all_type");

    let iconInput = createIconInput("all_type", allTypesInput)
    allTypesButton.appendChild(iconInput);
    
    let labelTextAllInput = document.createElement("p")
    labelTextAllInput.textContent = "Toutes les actions";

    allTypesLabel.appendChild(iconInput)
    allTypesLabel.appendChild(labelTextAllInput)

    allTypesButton.appendChild(allTypesLabel)
    parent.appendChild(allTypesButton);

    if (allTypesInput.checked){
        // Activer tous les sous-groupes
        Object.keys(subGroups).forEach(typeAction => { map.addLayer(subGroups[typeAction]) })
    }

    var checkboxes = [];
    // Ajouter un gestionnaire d'événements pour le bouton "Toutes les actions"
    allTypesInput.addEventListener("change", function () {
        if (this.checked) {

            // Activer tous les sous-groupes
            Object.keys(subGroups).forEach(typeAction => { map.addLayer(subGroups[typeAction]) })

            // Activer toutes les autres cases à cocher
            checkboxes.forEach(checkbox => { 
                checkbox.checked = true 
            });
        }
        else{

            // Désactiver tous les sous-groupes
            Object.keys(subGroups).forEach(typeAction => { map.removeLayer(subGroups[typeAction]) })

            // Désactiver toutes les autres cases à cocher
            checkboxes.forEach(checkbox => { 
                checkbox.checked = false
            })
        }
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

        container.appendChild(input);

        input.checked = (selectedTypes.includes(action) || selectedTypes.includes("all_type")) ? true : false
        
        checkboxes.push(input)

        let label = document.createElement("label");
        label.setAttribute("for", action);
        label.style.left = "6px";

        let iconInput = createIconInput(action, input)

        let labelText = document.createElement("p")
        labelText.textContent = sortedData[action].name;

        label.appendChild(iconInput);
        label.appendChild(labelText);
        
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
            updateResultsCounter(subGroups);
        });
    });
}

/**
 * Fonction de création de l'icone des filtres de types
 * @param {Object}action - Action
 * @param {Object}input - Input de l'action
 */
function createIconInput(action, input){
    let backColor = input.getAttribute("data-backColor")

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

/**
 * Fonction ajoutant ou supprimant les layers de la carte en fonction des filtres de type
 * @param {Object}marker - variable contenant le marqueur
 * @param {Object}subGroups - Variable contenant les sous-groupes du cluster
 * @param {str}typeAction - id du type d'action
 * @param {bool}remove - option de retrait du layer 
 */
function checkMarker(marker, subGroups, typeAction, remove = false){
    if (!subGroups[typeAction].hasLayer(marker) && marker.typeAction == typeAction) {
        subGroups[typeAction].addLayer(marker);
    }
    if(remove && (subGroups[typeAction].hasLayer(marker) && marker.typeAction == typeAction)){
        subGroups[typeAction].removeLayer(marker);
    }
}

/**
 * Fonction générant le filtre de statut des actions
 * @param {Object}action - Action
 * @param {Object}subGroups - Variable contenant les sous-groupes du cluster
 * @param {Object}map - Variable contenant l'objet carte
 * @param {Object}selectedStatut Variable contenant le statut sélectionné
 */
function addProspectsRadioButton(actions, subGroups, map, selectedStatut) {

    // Réinitialisation du conteneur
    $("#prospect-filter").empty()

    // S'il existe une entrée prospect dans le dataset initial, créé le fieldset radio button dans le filtre
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

/**
 * Fonction de création des champs du filtre de statut
 * @param {elt}fieldset - Element du DOM correspondant au fieldset du filtre
 * @param {str}id - id de l'option
 * @param {str}text - Texte du filtre
 * @param {Object}selectedStatut Variable contenant le statut sélectionné
 */
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

/**
 * Fonction générant la recherche textuelle
 * @param {array}actions - Dataset des actions
 * @param {array} typesAction - array of string des types d'actions
 * @param {Object} config - Informations de configuration
 * @param {Object} sortedData - Données triées issues de createSortedDataObject
 * @param {Object} map - Variable contenant l'objet carte
 */
function searchBox(actions, typesAction, config, map, sortedData) {

    if (!RegExp.escape) {
        RegExp.escape = function(s) {
            return s.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&")
        }
    }
    $('.search-bar').submit(function(e) { e.preventDefault() })
    $('#search').click(function(e) {

        // Récupération des informations des filtres
        var statut = document.querySelector('input[name="statut_action"]:checked')
        var selectedStatut = statut ? document.querySelector('input[name="statut_action"]:checked').value : undefined

        var selectedInputs = document.querySelectorAll('input[name="type_action"]:checked')

        var selectedTypes = Array.from(selectedInputs)
            .map(input => { return input.value})

        typesAction.map(type => { 
            var input = document.getElementById(type)
            input.checked = selectedTypes.includes(type) ? true : false
        })

        // Filtrer le dataset
        var filterQuery = filterSearch(actions)

        // Comportement pour réinitialiser la carte
        if (filterQuery == "reset"){
            filteredSortedData = sortedData
            selectedTypes = ["all_type"]
            selectedStatut = "all_statut" 
            document.getElementById("seeker").value = ""
        }
        else {
            filteredSortedData = createSortedDataObject(filterQuery.filtered, typesAction, config)
        }

        var isFullscreen = $("#open-close-filter").hasClass("fullscreen-filters")
        console.log(isFullscreen)

        // Détruire et reconstruire la carte (la méthode removeLayer ou clearLayers ne fonctionne pas, 
        // le parentgroup doit être stocké dans une autre variable inconnue..)
        if (map == undefined) { return }
        map.off()
        map.remove()
        map = undefined

        map = createMap()

        // Comportement responsive des filtres
        responsiveFilter(map)

        // Création des clusters
        createCluster(sortedData, actions, map, typesAction)

        // Ajoute un écouteur d'événements pour détecter les changements de mode plein écran
        document.addEventListener('fullscreenchange', onFullScreenChange);

        if(isFullscreen){
            var fullscreenButton = document.querySelector(".leaflet-control-zoom-fullscreen");
            if (fullscreenButton) {
                var clickEvent = new Event('click');
                fullscreenButton.dispatchEvent(clickEvent);
            }
        }
        // Création du bouton Réinitialiser les filtres
        createResetButton(map)

    })
}

/**
 * Fonction de filtre par texte
 * @param {array}actions Array des actions
 */
function filterSearch(actions) {

    var searchTerms = document.getElementById("seeker").value.replace(/\s$/gmi, "")

    // Comportement pour réinitialiser la carte
    if(searchTerms == "resetMap") { return "reset"}

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
/**
 * Fonction de normalisation des chaînes de caractères (suppression des accents)
 * @param {string} str Chaîne de caractères à normaliser
 */
const normalizeStringPlainText = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
/**
 * Fonction de filtre texte
 * @param {array}arr Array des données textuelles d'une action
 * @param {str}query Terme de recherche
 */
const filterIt = (arr, query) => {
    const normalizedQuery = normalizeStringPlainText(query);
    return arr.filter(obj => Object.keys(obj).some(key => {
        // Vérifier si la propriété est null ou undefined
        if (obj[key] === null || obj[key] === undefined) {
            return false;
        }
        const normalizedObjKey = normalizeStringPlainText(obj[key].toString());
        return new RegExp(normalizedQuery, "mgi").test(normalizedObjKey);
    }));
}


/**
 * Fonction de création du bouton reset de la carte
 * @param {Object}map - Variable contenant l'objet carte
 */
function createResetButton(map) {

    // Vérifie si le bouton existe et la retire le cas éxhéant
    if ($("#reset-button").length) {
        $("#reset-button").remove()
    }

    // Création d'un bouton réinitialisant la carte
    var resetButton = document.createElement("button")
    resetButton.id= "reset-button"
    resetButton.setAttribute("class", "leaflet-bar leaflet-control")
    resetButton.setAttribute("type", "button")
    resetButton.setAttribute("title", "Réinitialiser la carte")

    let img = new DOMParser().parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 328.32 335.24">
            <path d="m272.68,41.69c.7-1.2,1.18-2.62,2.13-3.58,8.06-8.17,16.25-16.22,24.3-24.4,5.24-5.33,11.3-7.22,18.38-4.58,6.45,2.41,9.87,8.12,9.88,16.08.03,28.45.04,56.89,0,85.34-.02,10.53-6.48,17.03-17.06,17.05-28.33.07-56.65.05-84.98,0-8.13-.01-13.87-3.55-16.35-10.11-2.69-7.13-.63-13.12,4.68-18.33,8.01-7.85,15.92-15.82,24.7-24.56-8.3-5.21-15.85-10.72-24.06-14.95-35.34-18.23-70.78-15.72-104.47,3.32-42.34,23.92-62.85,61.49-61.73,110.1,1.25,54.33,43.92,102.97,97.48,112.19,59.06,10.17,113.16-20.46,134.68-76.25,4.25-11.02,11.61-14.93,23.31-12.42,4.14.89,8.32,1.63,12.44,2.59,9.48,2.2,14.53,10.57,11.35,19.58-22.19,62.8-65.85,101.96-131.34,113.81-84.9,15.36-166.14-36.91-189.75-119.88C-19.69,121.46,37.59,25.09,129.83,4.28c51.97-11.73,97.68,1,138.54,33.99.87.7,1.74,1.42,2.62,2.11.18.14.44.2.66.29.34.34.69.69,1.03,1.03Z"/>
        </svg>`,
        'application/xml');

    resetButton.appendChild(resetButton.ownerDocument.importNode(img.documentElement, true))
  
    $(resetButton).on("click", e => {

        document.getElementById("seeker").value = "resetMap"
        $("#search").click()     
        
    })

    // Ajoutez le bouton à la carte
    var resetControl = L.control({ position: 'topleft' });
    resetControl.onAdd = function() {
        return resetButton;
    };
    resetControl.addTo(map);

} 

/**
 * Comportement responsive des filtres
 */
function responsiveFilter(map){

    // Cas reset map remove old event
    $("#open-close-filter").off("click");

    // Comportement du bouton de filtres
    $("#open-close-filter").on("click", e => {
        $("#mapDG-filter-container").toggleClass("open")
        $("#mapDG").toggleClass("open")
        $("#open-close-filter").toggleClass("open")

        if($("#open-close-filter").hasClass("open")){
            console.log("open")

            if(!$("#open-close-filter").hasClass("fullscreen-filters")){ return }
            map.dragging.disable();
            map.touchZoom.disable();
            map.doubleClickZoom.disable();
            map.scrollWheelZoom.disable();
      
        }
        else{
            console.log("close")

            if(!$("#open-close-filter").hasClass("fullscreen-filters")){ return }
            map.dragging.enable();
            map.touchZoom.enable();
            map.doubleClickZoom.enable();
            map.scrollWheelZoom.enable();
    
        }
        onkeyup = e => {
        if ((e.keyCode == 27) && $("#mapFilter, #open-close-filter, #mapMusee").hasClass("open")){
            $("#mapFilter, #open-close-filter").removeClass("open")
        }
        };

    })
}

/**
 * Fonction réglant le comportement des filtres lors du passage en plein écran
 */
function onFullScreenChange(map) {
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
        //map.scrollWheelZoom.disable();

    } else {
        // Si non, remet les éléments de filtre dans le conteneur de la carte
        parentContainer.insertBefore(filterElement, mapElement)
        parentContainer.insertBefore(buttonElement, mapElement)
        //map.scrollWheelZoom.enable();
    }
    $(filterElement).toggleClass("fullscreen-filters")
    $(buttonElement).toggleClass("fullscreen-filters")
}

/**
 * Fonction de normalisation des string
 * @param {str}str - string
 */
function normalize_string(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/gm, "_").toLowerCase()
}

/**
 * Fonction de création de l'icone de prospect
 * @param {Object}sortedData - Objet permettant la récupération de la couleur de la data
 */
function getProspectIcon(sortedData = false){
    var icon = new DOMParser().parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44.74 44.74" preserveAspectRatio="xMidYMin meet"  width="18" height="100%" fill="${sortedData.text_color}" style="background-color:${sortedData.color}">
                <path class="cls-1" d="m22.37,12.78c-.92,0-1.67.75-1.67,1.67v7.92c0,.92.75,1.67,1.67,1.67,0,0,0,0,0,0,0,0,0,0,0,0h4.36c.92,0,1.67-.75,1.67-1.67s-.75-1.67-1.67-1.67h-2.7v-6.25c0-.92-.75-1.67-1.67-1.67Z"/>
                <path class="cls-1" d="m43.07,20.7h-4.22c-.92,0-1.67.75-1.67,1.67s.75,1.67,1.67,1.67h2.47c-.8,9.16-8.12,16.48-17.28,17.28v-2.47c0-.92-.75-1.67-1.67-1.67s-1.67.75-1.67,1.67v2.47c-9.16-.8-16.48-8.12-17.28-17.28h2.47c.92,0,1.67-.75,1.67-1.67s-.75-1.67-1.67-1.67h-2.47C4.22,11.54,11.54,4.22,20.7,3.42v2.47c0,.92.75,1.67,1.67,1.67s1.67-.75,1.67-1.67v-2.47c2.35.21,4.64.85,6.75,1.89l-1.48,1.91,8.26,1.11-3.17-7.71-1.54,2c-3.22-1.71-6.83-2.62-10.5-2.62C10.03,0,0,10.03,0,22.37s10.03,22.37,22.37,22.37,22.37-10.03,22.37-22.37c0-.92-.75-1.67-1.67-1.67Z"/>
        </svg>`,
        'application/xml');
    return icon
}

/**
 * Fonction gérant le comportement du bouton d'accessibilité
 * @param {Object}subGroups - Variable contenant les sous-groupes du cluster
 */
function accessibilityButton(subGroups){
    $("#access-button").on("click", e => {
        accessibilityTable(subGroups)
    })
}

/**
 * Fonction de création de la table des résultats de la carte accessible
 * @param {Object}subGroups - Variable contenant les sous-groupes du cluster
 */
function accessibilityTable(subGroups){

    // Vérifie si la popup existe et la retire le cas éxhéant
    if ($("#access-modal").length) {
        $("#access-modal").remove()
    }

    var modal = document.createElement("section")
    modal.setAttribute("id", "access-modal")


    if($("#open-close-filter").hasClass("fullscreen-filters")){ 
        document.getElementById('mapDG').appendChild(modal)
    }
    else{
        document.getElementById("mapDG-container").appendChild(modal)
    }

    var closeButtonContainer = document.createElement("div")
    closeButtonContainer.setAttribute("class", "close-button-container")

    var closeButton = document.createElement("button")
    closeButton.setAttribute("class", "btn btn-default close")
    closeButton.textContent = "Fermer le tableau"
    $(closeButton).click(e => {
        $("#access-modal").remove()
    })
    closeButtonContainer.appendChild(closeButton)
    modal.appendChild(closeButtonContainer)

    var container = document.createElement("div")
    container.setAttribute("class", "table-container")

    var title = document.createElement("h2")
    title.textContent = "Liste des actions de la Philharmonie de Paris en France et à l'internationnal"
    container.appendChild(title)

    // Créé un tableau pat type d'action
    Object.keys(subGroups).map(typeAction => {
        var arrayMarkers = subGroups[typeAction].getLayers()

        var isChecked = document.querySelector(`input[name="type_action"][value="${typeAction}"]:checked`)

        if (!arrayMarkers || arrayMarkers.length == 0 || !isChecked) { return }
        var actionField = Object.keys(arrayMarkers[0].data)

        var table = document.createElement("table")
        var caption = document.createElement("caption")
        caption.textContent = subGroups[typeAction].name

        table.appendChild(caption)

        // Header du tableau
        var header = document.createElement("thead")
        header.setAttribute("style", `background-color:${subGroups[typeAction].color}; color:${subGroups[typeAction].text_color};`)

        if (actionField.some(e => e == "prospect")){
            createHeaderEntry(header, "Prospect")
        }

        createHeaderEntry(header, "Nom")

        let conditions = ["nom_orchestre", "nom_projet", "nom_expo", "nom_expo_distance"]
        var isProduction = false
        if (conditions.some(str => actionField.toString().includes(str))){
            createHeaderEntry(header, "Production")
            isProduction = true
        }

        if (actionField.some(e => e == "type_orchestre")){
            createHeaderEntry(header, "Type d'orchestre")
        }

        if (actionField.some(e => e == "type_cooperation")){
            createHeaderEntry(header, "Type de coopération")
        }

        if (actionField.some(e => e == "date")){
            createHeaderEntry(header, "Date")
        }

        if (actionField.some(e => e == "saison")){
            createHeaderEntry(header, "Saison")
        }

        if (actionField.some(e => e == "nombre_structures")){
            createHeaderEntry(header, "Structures abonnées")
        }

        if (actionField.some(e => e == "services")){
            createHeaderEntry(header, "Services")
        }

        createHeaderEntry(header, "Adresse")

        if (actionField.some(e => e == "lien")){
            createHeaderEntry(header, "Lien")
        }

        table.appendChild(header)

        // Body du tableau
        var body = document.createElement("tbody")
        subGroups[typeAction].getLayers().map(marker => {

            var action = marker.data
            var line = document.createElement("tr")
            line.setAttribute("scope", "row")

            var prospect = document.createElement("td")
            prospect.textContent = action.prospect
            line.appendChild(prospect)
            
            var nom = document.createElement("td")
            nom.textContent = action.nom
            line.appendChild(nom)

            if (isProduction){
                var production = document.createElement("td")
                production.textContent = action.nom_orchestre || action.nom_projet || action.nom_expo || action.nom_expo_distance
                line.appendChild(production)
            }
            if (actionField.some(e => e == "type_orchestre")){
                var type_orchestre = document.createElement("td")
                type_orchestre.textContent = action.type_orchestre
                line.appendChild(type_orchestre)
            }
    
            if (actionField.some(e => e == "type_cooperation")){
                var type_cooperation = document.createElement("td")
                type_cooperation.textContent = action.type_cooperation
                line.appendChild(type_cooperation)
            }
    
            if (actionField.some(e => e == "date")){
                var date = document.createElement("td")
                let date_debut = simplifyDate(action.date)
                let date_fin = simplifyDate(action.date_fin)
                let dateText = `${date_debut} ${date_fin && (date_fin != date_debut) ? "| " + date_fin : ""}`
                date.textContent = dateText == "undefined " ? "" : dateText
                line.appendChild(date)
            }
    
            if (actionField.some(e => e == "saison")){
                var saison = document.createElement("td")
                saison.textContent = action.saison
                line.appendChild(saison)
            }
    
            if (actionField.some(e => e == "nombre_structures")){
                var nombre_structures = document.createElement("td")
                nombre_structures.textContent = action.nombre_structures
                line.appendChild(nombre_structures)
            }
    
            if (actionField.some(e => e == "services")){
                let p = "Accès sur place"
                let a = "Accès à domicile"
                let servicesString = ""
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
                var services = document.createElement("td")
                services.textContent = servicesString
                line.appendChild(services)
            }

            let adresseString = [...new Set([
                action.adresse, 
                action.complement_adresse, 
                action.code_postal,
                action.ville,
            ])].filter( Boolean ).join(" ")
        
            let stateString = [...new Set([
                action.departement, 
                action.etat, 
                action.pays
            ])].filter( Boolean ).join(", ")

            var adresse = document.createElement("td")
            adresse.textContent = adresseString + " " + stateString
            line.appendChild(adresse)

            if (actionField.some(e => e == "lien")){
                var cell = document.createElement("td")
                let lien = document.createElement("a")
                lien.setAttribute("href", action.lien)
                lien.setAttribute("title", "Aller sur la page de l'action dans un nouvel onglet")
                lien.setAttribute("target", "_blank")
                lien.textContent = "Informations"
                cell.appendChild(lien)
                line.appendChild(cell)
            }

            body.appendChild(line)
        })
        table.appendChild(body)
        container.appendChild(table)
    })

    modal.appendChild(container)
}

/**
 * Fonction de création des élements du header des tableaux accessible
 * @param {elt}header - Element html de l'header
 * @param {str}text - Texte de l'entrée
 */
function createHeaderEntry(header, text){
    var headerEntry = document.createElement("th")
    headerEntry.setAttribute("scope", "col")
    headerEntry.textContent = text
    header.appendChild(headerEntry)
}

/**
 * Fonction du comportement responsive de la carte
 */
function responsiveMap(){
    setResponsiveHeight()
    addEventListener("resize", () => {
        setResponsiveHeight()
    });
}

/**
 * Fonction du comportement responsive en fonction de la hauteur de fenetre
 */
function setResponsiveHeight(){
    var margin = 40
    var titleHeight = $('.map-title').outerHeight(true)
    var filters = document.getElementById("mapDG-filter-container")
    var mapContainer = document.getElementById("mapDG")

    var windowHeight = window.innerHeight
    var mapElementsHeight = windowHeight - titleHeight - margin
    filters.style.height = mapElementsHeight + "px"
    mapContainer.style.height = mapElementsHeight + "px"
}

/**
 * Fonction de debogage de la carte permettant d'extraire les données d'une ville
 * @param {str}city - Nom d'une ville
 */
function checkAction(city){
    return window.actions.filter(action => { return action.ville == city})
}
