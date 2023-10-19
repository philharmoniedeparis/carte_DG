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

    // Ajout fausse configuration dans l'attente de l'API
    const config = data[0]
    const actions = data[1]
    // Extrait la liste des types d'actions
    const typesAction = [...new Set(actions.map(item => item.action))]

    // Tri préliminaire des données par type d'action et ajout des informations de configuration
    const sortedData = createSortedDataObject(actions, typesAction, config) 

    const analyzeData = data => {
        console.log(data)
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
    analyzeData(sortedData)


    // Comportement responsive des filtres
    responsiveFilter()

    // Ajout conditionnel du fieldset des prospects
    addProspectsRadioButton(data)

    // Complète les types d'actions
    //addTypesRadioButton(sortedData)

    // Création de la carte
    const map = createMap()

    /* // Test marker japon
    L.marker([35.6828387, 139.7594549]).addTo(map) */

    // Création des clusters
    createCluster(sortedData, map)

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

function createCluster(sortedData, map) {
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
            arrayMarkers.push(marker);
        });

        // Créer un sous-groupe pour chaque type d'action
        var actionGroup = L.featureGroup.subGroup(parentGroup, arrayMarkers);
        subGroups[typeAction] = actionGroup; // Ajouter le sous-groupe à l'objet subGroups
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
        changeColorRadioButton(elt)
        /* if (this.checked) {
            // Activer tous les sous-groupes
            Object.keys(subGroups).forEach(typeAction => {
                map.addLayer(subGroups[typeAction]);
            });
        } */
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
            var selectedType = this.value;

            changeColorRadioButton(elt)

            // Activer le sous-groupe sélectionné et désactiver les autres
            /* Object.keys(subGroups).forEach(typeAction => {
                if (typeAction === selectedType) {
                    map.addLayer(subGroups[typeAction]);
                } else {
                    map.removeLayer(subGroups[typeAction]);
                }
            }); */
        });

        // Sélectionnez tous les boutons radio par défaut
        input.checked = true;
    });


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
    let icon = defineIcon(sortedData.color)
    let popup = createPopup(action, sortedData)
    return L.marker([latitude, longitude], {icon: icon}).bindPopup(popup).openPopup()
    //return L.marker([longitude, latitude], {icon: icon}).bindPopup(popup).openPopup()
}
function defineIcon(color) {
    var iconPath = `
        <div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25.66 35.26" class="icon" fill="${color}">
                <path d="m12.83,0C5.74,0,0,5.74,0,12.83c0,7.08,7.6,15.91,12.83,22.43,5.23-6.52,12.83-15.35,12.83-22.43S19.91,0,12.83,0"/>
            </svg>
            <div class="icon-shadow"></div>
        </div>`

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

    /* !!!!!!!!!!!!!!!!!!!!!!! */
    /* TODO : change condition */
    /* !!!!!!!!!!!!!!!!!!!!!!! */

    if(action.prospect == "oui"){
        let container = document.createElement("div")
        container.setAttribute("class", "prospect")

        let icon = getProspectIcon(sortedData)
        container.appendChild(container.ownerDocument.importNode(icon.documentElement, true))

        let prospect = document.createElement("p")
        prospect.textContent = "Prospect"
        container.appendChild(prospect)

        popupContent.appendChild(container)

        let separator = document.createElement("div")
        separator.setAttribute("class", "separator")
        popupContent.appendChild(separator)
    }

    // Type d'action
    let typeAction = document.createElement("h4")
    typeAction.setAttribute("class", "type-action")
    typeAction.textContent = sortedData.name
    popupContent.appendChild(typeAction)

    if(action.prospect == "non"){
        let separator = document.createElement("div")
        separator.setAttribute("class", "separator")
        popupContent.appendChild(separator)
    }
    
    let title = document.createElement("h3")
    title.textContent = action.nom
    popupContent.appendChild(title) 

    let subtitle = document.createElement("h4")
    subtitle.textContent = action.nom_orchestre
    popupContent.appendChild(subtitle)

    // Adresse 
    let adresse = document.createElement("address")
    adresse.setAttribute("class", "address-action")
    adresse.textContent = `${action.ville ? action.ville : ''} ${action.region ? action.region : ''} ${action.pays ? action.pays : ''}`
    popupContent.appendChild(adresse)

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


function addProspectsRadioButton(data){
    // S'il existe une entrée prospect, créé le fieldset radio button dans le filtre
    if (data.some(e => e.prospect === "oui")) {

        let fieldset = document.createElement("fieldset")
        fieldset.setAttribute("id", "statut_action")

        createField("all_statut", "Toutes les actions")
        createField("prospects", "Prospects")
        createField("en_cours", "Actions en cours")

        function createField(id, text){
            let container = document.createElement("div")

            let input = document.createElement("input")
            input.setAttribute("type", "radio")
            input.setAttribute("id", id)
            input.setAttribute("name", "statut_action")
            input.setAttribute("value", id)
            container.appendChild(input)

            let label = document.createElement("label")
            label.setAttribute("for", id)
            label.style.left = "6px"
            label.textContent = text
            container.appendChild(label)

            if(id == "prospects"){
                let icon = getProspectIcon()
                container.appendChild(container.ownerDocument.importNode(icon.documentElement, true))
            }
    
            fieldset.appendChild(container)
        }

        let sibbling = document.getElementById("search-bar")
        let parent = document.getElementById("mapDG-filter-container")
        parent.insertBefore(fieldset, sibbling)
    }
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