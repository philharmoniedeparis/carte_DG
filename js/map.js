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

    // Variable de sauvegarde des marqueurs
    window["markers"] = []

    /* /////////// Fonctions de debuggage /////////// */

    window["actions"] = data[1]
    window["dateTypes"] = []

    const analyzeData = data => {
        var output = {}
        Object.keys(data).map(type => {
            output[type] = []
            Object.keys(data[type].data[0]).map(field => { output[type].push(field) })
            
            
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
    //analyzeData(sortedData)

    /* /////////// END Fonctions de debuggage /////////// */

    // Ajout fausse configuration dans l'attente de l'API
    const config = data[0]
    const actions = data[1]
    // Extrait la liste des types d'actions
    const typesAction = [...new Set(actions.map(item => item.action))]

    // Tri préliminaire des données par type d'action et ajout des informations de configuration
    const sortedData = createSortedDataObject(actions, typesAction, config) 
    console.log(sortedData)
    // Comportement responsive des filtres
    responsiveFilter()

    // Création de la carte
    const map = createMap()

    // Création des clusters
    createCluster(sortedData, actions, map)

    // Ajoute un écouteur d'événements pour détecter les changements de mode plein écran
    document.addEventListener('fullscreenchange', onFullScreenChange);

    // Création du bouton Réinitialiser les filtres
    createResetButton()

    /* 
    NOTE 
    - Générer les marqueurs en fonction des données d'actions,
    - filtrer les datas, reshape and regenerate (prospect & input text)
    - type d'action subgroup
    */
   //console.log(window.dateTypes)
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
    // Initialisation de la carte
    const initial_view = { latlng : [0,0], zoom : 2 }
    const map = L.map('mapDG', { 
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: 'topleft'
        },
        worldCopyJump: true,
        scrollWheelZoom: true, 
        minZoom :  1.5,
        maxZoom: 12,
    }).setView(initial_view.latlng, initial_view.zoom); 
  
    L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    return map
}

function createCluster(sortedData, actions, map) {
    var parentGroup = L.markerClusterGroup({
        showCoverageOnHover: false
    });

    var subGroups = {}; // Un objet pour stocker les sous-groupes

    Object.keys(sortedData).forEach(typeAction => {
        var arrayMarkers = [];

        sortedData[typeAction].data.forEach(action => {
            if (!action.latitude && !action.longitude) { 
                return;
            }
            let marker = createMarker(sortedData[typeAction], action);
            marker["prospect"] = action.prospect
            arrayMarkers.push(marker);
        });

        // Créer un sous-groupe pour chaque type d'action
        var actionGroup = L.featureGroup.subGroup(parentGroup, arrayMarkers);
        subGroups[typeAction] = actionGroup; // Ajouter le sous-groupe à l'objet subGroups
        console.log(typeAction )
        console.log(subGroups[typeAction] )
    });

    // Ajouter les sous-groupes au contrôle de couches
    var overlayMaps = {};
    Object.keys(subGroups).forEach(typeAction => {
        overlayMaps[typeAction] = subGroups[typeAction];
        // Activer chaque sous-groupe par défaut
        map.addLayer(subGroups[typeAction]);
    });

    // Créer le contrôle de couches et l'ajouter à la carte
    var layersControl = L.control.layers(null, overlayMaps).addTo(map);

    // Ajouter les boutons radio au fieldset
    addTypesRadioButton(sortedData, layersControl, subGroups, map);

    // Ajout conditionnel du fieldset des prospects
    addProspectsRadioButton(actions, subGroups, map)
    
    parentGroup.addTo(map);
}

function addTypesRadioButton(sortedData, layersControl, subGroups, map) {
    var parent = document.getElementById("type_action_container");

    // Ajoutez un bouton "Toutes les actions" pour afficher tous les sous-groupes
    var allTypesButton = document.createElement("div")
    allTypesButton.setAttribute("class", "btn btn-default")

    var allTypesInput = document.createElement("input");
    allTypesInput.setAttribute("type", "radio");
    allTypesInput.setAttribute("id", "all_type");
    allTypesInput.setAttribute("name", "type_action");
    allTypesInput.setAttribute("value", "all");
    allTypesInput.checked = true;
    
    var allTypesLabel = document.createElement("label");
    allTypesLabel.setAttribute("for", "all_type");
    allTypesLabel.textContent = "Toutes les actions";

    allTypesButton.appendChild(allTypesInput)
    allTypesButton.appendChild(allTypesLabel)

    parent.appendChild(allTypesButton);

    // Ajouter un gestionnaire d'événements pour le bouton "Toutes les actions"
    allTypesInput.addEventListener("change", function (elt) {
        clickPatch()
        changeColorRadioButton(elt)
        if (this.checked) {
            // Activer tous les sous-groupes
            Object.keys(subGroups).forEach(typeAction => {
                map.addLayer(subGroups[typeAction]);
            });
        }
    });

    Object.keys(sortedData).forEach(action => {
        let container = document.createElement("div");
        container.setAttribute("data-backColor", sortedData[action].color);
        container.setAttribute("data-color", sortedData[action].text_color);

        let input = document.createElement("input");
        input.setAttribute("type", "radio");
        input.setAttribute("id", action);
        input.setAttribute("name", "type_action");
        input.setAttribute("value", action);
        input.style.backgroundColor = sortedData[action].color;
        container.appendChild(input);

        let label = document.createElement("label");
        label.setAttribute("for", action);
        label.style.left = "6px";
        label.textContent = sortedData[action].name;
        container.appendChild(label);

        parent.appendChild(container);

        // Ajouter un gestionnaire d'événements pour chaque bouton radio
        input.addEventListener("change", function (elt) {
            clickPatch()
            var selectedType = this.value;

            changeColorRadioButton(elt)

            // Activer le sous-groupe sélectionné et désactiver les autres
            Object.keys(subGroups).forEach(typeAction => {
                if (typeAction === selectedType) {
                    map.addLayer(subGroups[typeAction]);
                } else {
                    map.removeLayer(subGroups[typeAction]);
                }
            });
        });

        // Sélectionnez tous les boutons radio par défaut
        input.checked = true;
    });
}

function addProspectsRadioButton(actions, subGroups, map) {
    // S'il existe une entrée prospect, créé le fieldset radio button dans le filtre
    if (actions.some(e => e.prospect === "oui")) {

        let fieldset = document.createElement("fieldset")
        fieldset.setAttribute("id", "statut_action")

        createField("all_statut", "Toutes les actions", true)
        createField("prospects", "Prospects")
        createField("en_cours", "Actions en cours")

        function createField(id, text, checked = false) {
            let container = document.createElement("div")

            let input = document.createElement("input")
            input.setAttribute("type", "radio")
            input.setAttribute("id", id)
            input.setAttribute("name", "statut_action")
            input.setAttribute("value", id)
            if(checked) {
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

        let sibbling = document.getElementById("search-bar")
        let parent = document.getElementById("mapDG-filter-container")
        parent.insertBefore(fieldset, sibbling)



        fieldset.addEventListener("change", function () {
            var selectedStatut = document.querySelector('input[name="statut_action"]:checked').value

            //clickPatch()

            // Filtrer les marqueurs en fonction de la sélection "Statut" et de la sélection du type d'action
            Object.keys(subGroups).forEach(typeAction => {
                //var markers = window.markersGroups[typeAction].getLayers();
                window.markers.forEach(marker => {
                    switch (selectedStatut) {
                        case "all_statut":
                            if (!subGroups[typeAction].hasLayer(marker) && marker.typeAction == typeAction) {
                                subGroups[typeAction].addLayer(marker);
                            }
                            break;
                        case "prospects":
                            if (marker.prospect == "oui") {
                                if (!subGroups[typeAction].hasLayer(marker) && marker.typeAction == typeAction) {
                                    subGroups[typeAction].addLayer(marker);
                                }
                            } else {
                                if (subGroups[typeAction].hasLayer(marker) && marker.typeAction == typeAction) {
                                    subGroups[typeAction].removeLayer(marker);
                                }
                            }
                            break;
                        case "en_cours":
                            if (marker.prospect == "non") {
                                if (!subGroups[typeAction].hasLayer(marker) && marker.typeAction == typeAction) {
                                    subGroups[typeAction].addLayer(marker);
                                }
                            } else {
                                if (subGroups[typeAction].hasLayer(marker) && marker.typeAction == typeAction) {
                                    subGroups[typeAction].removeLayer(marker);
                                }
                            }
                            break;
                        default:
                            break;
                    }
                });
            });

        })
    }
}

function clickPatch(){
    const selectedStatut = document.querySelector('input[name="statut_action"]:checked')
    let radios = $('input[name="statut_action"]')
    console.log(radios)

    radios.map(index => { 
        radios[index].checked = true
    })
    selectedStatut.checked = true
}
function changeColorRadioButton(e){
    // Gestion de la couleur de fond
    $("#type_action_container div").removeClass("checked")
    var typeSelected = $(e.target).is("div") ? $(e.target) : $(e.target).parent("div")

    typeSelected.addClass("checked")
    document.documentElement.style.setProperty('--radio-type-background', typeSelected.attr("data-backColor"));
    document.documentElement.style.setProperty('--radio-type-color', typeSelected.attr("data-color"));
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
    var subtitleString = action.nom_orchestre || action.nom_projet || action.nom_expo || action.nom_expo_distance || action.nom_projet
    if (subtitleString){
        let subtitle = document.createElement("h4")
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
        //window.dateTypes.push(action.date)
        //window.dateTypes.push(action.date_fin)
        let date = document.createElement("p")
        date.innerHTML = `<b>Date : </b>${action.date} ${action.date_fin ? "| " + action.date_fin : ""}`
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
