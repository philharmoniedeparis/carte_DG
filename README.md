# Documentation de `map.js`

 * Documentation pour map.js
 * Ce fichier contient le code pour créer une carte interactive en utilisant Leaflet
 * et ses plugins : markerCluster, FullScreen, et subGroup.

## getData
  Récupère les données des marqueurs de la carte et de configuration
 
  `@param {function} callback` - callback éxécuté une fois le chargement des données effectué

```javascript
function getData(callback){
```

## generalMapFunction
Fonction générale de génération de la carte
 
  `@param {Object} data` - Dataset de la carte

```javascript
function generalMapFunction(data){
```

## createSortedDataObject
Fonction de tri et de calcul statistique des données
 
  `@param {Object} data` - Dataset des actions
 
  `@param {array} typesAction` - array of string des types d'actions
 
  `@param {Object} config` - Informations de configuration

```javascript
function createSortedDataObject(data, typesAction, config) {
```

## createMap
Fonction de création de la carte

```javascript
function createMap(){
```

## createMarker
Fonction de création des marqueurs
 
  `@param {Object} sortedData` - Données triées issues de createSortedDataObject
 
  `@param {Object} action` - action du dataset

```javascript
function createMarker(sortedData, action) {
```

## defineIcon
Fonction de création de l'icone du marqueur
 
  `@param {Object} sortedData` - Données triées issues de createSortedDataObject
 
  `@param {Object} action` - action du dataset

```javascript
function defineIcon(sortedData, action) {
```

## createPopup
Fponction de création de la popup du marqueur
 
  `@param {Object} sortedData` - Données triées issues de createSortedDataObject
 
  `@param {Object} action` - action du dataset

```javascript
function createPopup(action, sortedData) {
```

## simplifyDate
Fonction de simplification des dates du dataset
 
  `@param {string} str` - Date issue de l'action

```javascript
function simplifyDate(str){
```

## createCluster
Fonction de création du cluster contenant les marqueurs
 
  `@param {Object} sortedData` - Données triées issues de createSortedDataObject
 
  `@param {Object} action` - action du dataset
 
  `@param {Object} map` - Variable contenant l'objet carte
 
  `@param {Object} selectedTypes` Variable contenant les types sélectionnés
 
  `@param {Object} selectedStatut` Variable contenant le statut sélectionné

```javascript
function createCluster(sortedData, actions, map, selectedTypes = ["all_type"], selectedStatut = "all_statut") {
```

## updateResultsCounter
Fonction de mise à jour du compteur d'action
 
  `@param {Object} subGroups` Sous
 
  `@param {Object} selectedStatut` Variable contenant le statut sélectionné
 
  `@param {Object} selectedTypes` Variable contenant les types sélectionnés

```javascript
function updateResultsCounter(subGroups, selectedStatut, selectedTypes){
```

## disableNoResult
Fonction désactivant l'option du filtre de type lorsqu'aucun résultat n'est présent sur la carte
  @param {Object}subGroups - Variable contenant les sous-groupes du cluster

```javascript
function disableNoResult(subGroups){
```

## addTypesCheckBox
Fonction ajoutant les types d'actions disponibles
 
  `@param {Object} sortedData` - Données triées issues de createSortedDataObject
 
  `@param {Object}subGroups` - Variable contenant les sous-groupes du cluster
 
  `@param {Object} map` - Variable contenant l'objet carte
 
  `@param {Object} selectedTypes` Variable contenant les types sélectionnés

```javascript
function addTypesCheckBox(sortedData, subGroups, map, selectedTypes) {
```

## createIconInput
Fonction de création de l'icone des filtres de types
 
  `@param {Object}action` - Action
 
  `@param {Object}input` - Input de l'action

```javascript
function createIconInput(action, input){
```

## typeCheckedStyle
Modification du style pour les checkboxs cochées et décochées
 
  `@param {Object}input` - Input du type d'action

```javascript
function typeCheckedStyle(input){
```

## checkMarker
Fonction ajoutant ou supprimant les layers de la carte en fonction des filtres de type
 
  `@param {Object}marker` - variable contenant le marqueur
 
  `@param {Object}subGroups` - Variable contenant les sous-groupes du cluster
 
  `@param {str}typeAction` - id du type d'action
 
  `@param {bool}remove` - option de retrait du layer

```javascript
function checkMarker(marker, subGroups, typeAction, remove = false){
```

## addProspectsRadioButton
Fonction générant le filtre de statut des actions
 
  `@param {Object}action` - Action
 
  `@param {Object}subGroups` - Variable contenant les sous-groupes du cluster
 
  `@param {Object}map` - Variable contenant l'objet carte
 
  `@param {Object}selectedStatut` Variable contenant le statut sélectionné

```javascript
function addProspectsRadioButton(actions, subGroups, map, selectedStatut) {
```

## createField
Fonction de création des champs du filtre de statut
 
  `@param {elt}fieldset` - Element du DOM correspondant au fieldset du filtre
 
  `@param {str}id` - id de l'option
 
  `@param {str}text` - Texte du filtre
 
  `@param {Object}selectedStatut` Variable contenant le statut sélectionné

```javascript
function createField(fieldset, id, text, selectedStatut) {
```

## searchBox
Fonction générant la recherche textuelle
 
  `@param {array}actions` - Dataset des actions
 
  `@param {array} typesAction` - array of string des types d'actions
 
  `@param {Object} config` - Informations de configuration
 
  `@param {Object} sortedData` - Données triées issues de createSortedDataObject
 
  `@param {Object} map` - Variable contenant l'objet carte

```javascript
function searchBox(actions, typesAction, config, map, sortedData) {
```

## filterSearch
Fonction de filtre par texte
 
  `@param {array}actions` Array des actions

```javascript
function filterSearch(actions) { 
```

## filterIt
Fonction de filtre texte
 
  `@param {array}arr` Array des données textuelles d'une action
 
  `@param {str}query` Terme de recherche
 
```javascript
filterIt(arr, query) {
```

## createResetButton
Fonction de création du bouton reset de la carte
 
  `@param {Object}map` - Variable contenant l'objet carte

```javascript
function createResetButton(map) {
```

## responsiveFilter
Comportement responsive des filtres

```javascript
function responsiveFilter(){
```

## onFullScreenChange
Fonction réglant le comportement des filtres lors du passage en plein écran

```javascript
function onFullScreenChange() {
```

## normalize_string
Fonction de normalisation des string
 
  `@param {str}str` - string

```javascript
function normalize_string(str) {
```

## getProspectIcon
Fonction de création de l'icone de prospect
 
  `@param {Object}sortedData` - Objet permettant la récupération de la couleur de la data

```javascript
function getProspectIcon(sortedData = false){
```

## accessibilityButton
Fonction gérant le comportement du bouton d'accessibilité
 
  `@param {Object}subGroups` - Variable contenant les sous-groupes du cluster

```javascript
function accessibilityButton(subGroups){
```

## accessibilityTable
Fonction de création de la table des résultats de la carte accessible
 
  `@param {Object}subGroups` - Variable contenant les sous-groupes du cluster

```javascript
function accessibilityTable(subGroups){
```

## createHeaderEntry
Fonction de création des élements du header des tableaux accessible
 
  `@param {elt}header` - Element html de l'header
 
  `@param {str}text` - Texte de l'entrée

```javascript
function createHeaderEntry(header, text){
```

## responsiveMap
Fonction du comportement responsive de la carte

```javascript
function responsiveMap(){
```

## setResponsiveHeight
Fonction du comportement responsive en fonction de la hauteur de fenetre

```javascript
function setResponsiveHeight(){
```

## checkAction
Fonction de debogage de la carte permettant d'extraire les données d'une ville
 
  `@param {str}city` - Nom d'une ville

```javascript
function checkAction(city){
```

