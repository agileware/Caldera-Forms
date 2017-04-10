
function CFFieldBrowser( fieldTypes, $tmpl, $el, $ ){

}
/**
 * Form editor system
 *
 * @since 1.5.1
 *
 * @param editorConfig
 * @param $ jQuery
 * @constructor
 */

function CFFormEditor( editorConfig, $ ){

    var editorAPI,
        store,
        self = this,
        $coreForm,
        fieldConfigs = {},
        currentFromFields = {},
        compiledTemplates = {},
		compiledTemplatesList = {},
        $editorBody = $('.caldera-editor-body'),
        $saveButton = $('.caldera-header-save-button'),
        lastMagicList = {
            system: {},
            notSystem: {}
        },
        lastMagicObj = {
            system: {},
            notSystem: {}
        };

    /**
     * Initialize editor
     *
     * @since 1.5.1
     */
    this.init = function () {
        setUpClickHandlers();
        $coreForm = $( 'form#' + editorConfig.formId );
        editorAPI = new CFFormEditorAPI(
            editorConfig.api, editorConfig.formId, editorConfig.nonce, $
        );
        $.when( editorAPI.getForm() ).then( function (r,z) {
            store = new CFFormEditStore( r );
            self.createFieldPreviews();
            var firstField = $('.layout-grid-panel .icon-edit').first().data( 'field' );
            renderFieldConfig(getFieldConfigWrapper(firstField), self.getStore().getField( firstField ) );
        });


    };

    /**
     * Create field previews
     *
     * @since 1.5.1
     */
    this.createFieldPreviews = function () {
      $.each( this.getStore().getFields(), function(fieldId, field){
            self.buildFieldPreview(fieldId);
      });
    };

    /**
     * Get the form store
     *
     * @since 1.5.1
     *
     * @returns {CFFormEditStore}
     */
    this.getStore = function () {
        return store;
    };

    /**
     * Enable submit button
     *
     * @since 1.5.1
     */
    this.enableSubmit = function () {
        $saveButton.prop('disabled', false);
    };

    /**
     * Disable submit button
     *
     * @since 1.5.1
     */
    this.disableSubmit = function () {
        $saveButton.prop('disabled', true);
    };

    this.saveForms = function () {
        return {
            before: function (el, e) {
                e.preventDefault();

                if (!check_required_bindings()) {
                    return false;
                }

                $('#save_indicator').addClass('loading');
                if (typeof tinyMCE !== 'undefined') {
                    tinyMCE.triggerSave();
                }

                var data_fields = $('.caldera-forms-options-form').formJSON();
                if (data_fields.conditions) {
                    data_fields.config.conditional_groups = {conditions: data_fields.conditions};
                }
                $(el).data('cf_edit_nonce', data_fields.cf_edit_nonce);
                $(el).data('_wp_http_referer', data_fields._wp_http_referer);
                $(el).data('sender', 'ajax');

                //this would let us get fields from store, but not ready for that yet.
                //data_fields.config.fields = self.getStore().getFields();
                $(el).data('config', JSON.stringify(data_fields.config));

                return true;
            },
            callback: function (obj) {
                if (false === obj.data) {
                    var $notice = $('.updated_notice_box');

                    $notice.stop().animate({top: 0}, 200, function () {
                        setTimeout(function () {
                            $notice.stop().animate({top: -75}, 200);
                        }, 2000);
                    });
                }
            },
            complete: function (obj) {
                $('.wrapper-instance-pane .field-config').prop('disabled', false);
            }
        }
    };

    /**
     * Get all processors currently in form
     *
     * @todo Use store not DOM
     *
     * @since 1.5.1
     *
     * @returns {Array}
     */
    this.getCurrentProcessors = function() {
        //for now, pull of DOM
        var $el,
            processors = [];
        $( '.caldera-editor-processor-config-wrapper' ).each(function (i,el) {
            $el = $( el );
            processors.push({
                id: $el.attr( 'id' ),
                type: $el.data( 'type' ),
                name: $el.find( 'h3' ).first().html()
            });
        });

        return processors;
    };

    /**
     * Create magic tag list as UL
     *
     * @since 1.5.1
     * 
     * @param includeSystem
     * @returns {*|jQuery|HTMLElement}
     */
    this.magicTagsUl = function ( includeSystem ) {
        var cachedObj,
            cachedList,
            list = optList(true),
            $list = $( '<ul>' ),
            i;
        if( includeSystem ){
            cachedObj = lastMagicObj.system;
            cachedList = lastMagicList.system;
        }else{
            cachedObj = lastMagicObj.notSystem;
            cachedList = lastMagicList.notSystem;
        }
        if( ! emptyObject( cachedObj ) && ! emptyObject( cachedList ) && JSON.stringify(cachedObj) === JSON.stringify(list)  ){
            return cachedList;
        }

        //@todo translations!
        $list.append( '<li class="header">Fields</li>' );
        $.each( list.fields, function (i,field) {
            $list.append( '<li class="tag" data-tag="%'+ field.slug + '%"><strong></strong>%'+ field.slug + '%</li>')
        });

        if (includeSystem) {
            $list.append('<li class="header">System Tags</li>');
            $.each(list.system, function (i, tag) {
                $list.append('<li class="tag" data-tag="' + tag.value + '"><strong></strong>' + tag.label + '</li>');
            });

            $.each(list.processors, function (i, processor) {
                $list.append('<li class="header">' + processor.name + '</li>');
                var tagGroup;
                for (tagGroup in processor.tags) {
                    $.each(processor.tags[tagGroup], function (i, tag) {
                        $list.append('<li class="tag" data-tag="{' + tag + '}"><strong></strong>{' + tag + '} </li>');
                    });
                }
            });


        };

        if( includeSystem ){
            lastMagicObj.system = list;
            lastMagicList.system = $list;
        }else{
            lastMagicObj.notSystem = list;
            lastMagicList.notSystem = $list;
        }

        return $list;


    };
    
    this.newField = function ($target) {
			var x = 1;
	};

	this.hideEditor = function () {
		$editorBody.hide().attr( 'aria-hidden', true );
	};
	this.showEditor = function () {
		$editorBody.show().attr( 'aria-hidden', true );
	};

    function setUpOptions($wrapper,fieldId) {
        var opts = self.getStore().getFieldOptions( fieldId );
        if( opts ){
            renderOptions(fieldId );

            //the rest of this conditional is why I wish I was using Vue or something :(

            //Prevent no default and a default from being checked
            $wrapper.find( '.toggle_set_default' ).not( '.no-default' ).on( 'change', function () {
                $wrapper.find( '.no-default' ).prop( 'checked', false );
                $wrapper.find( '.toggle_set_default' ).prop( 'checked', false );
                $(this).prop( 'checked', true );
            });

            $wrapper.find( '.no-default' ).on( 'change', function () {
                //nice vintage vibe here
                if( $(this).is(':checked') ){
                    $wrapper.find( '.toggle_set_default' ).not( '.no-default' ).prop( 'checked', false );
                }
            });

            //this hack to prevent showing values when not needed, sucks.
            var showValues = true;
            $.each( opts, function (i,v) {
                if ( ! v.value ) {
                    showValues = false;
                    return false;
                }

            } );

            if( showValues ){
                $wrapper.find( '.toggle_show_values' ).prop( 'checked', true ).trigger( 'change' );
            }else{
                $wrapper.find( '.toggle_show_values' ).prop( 'checked', false ).trigger( 'change' );
            }

            var fieldDefault = self.getStore().getFieldOptionDefault( fieldId );
            if( fieldDefault  ){
                $( '#value-default-' + fieldDefault ).prop( 'checked', true );
                $wrapper.find( '.no-default' ).prop( 'checked', false );

            }else{
                $wrapper.find( '.no-default' ).prop( 'checked', true );
            }
        }

        $wrapper.on('click', '.add-toggle-option', function(e){
            var $clicked		= $(this),
                fieldId = $clicked.data( 'field' );

            if($clicked.data('bulk')){
                $($clicked.data('bulk')).toggle();
                $($clicked.data('bulk')).find('textarea').focus();
                return;
            }

            var            $toggleRows	= $wrapper.find('.toggle-options'),
                template = getOptRowTmpl();

            if($clicked.data('options')){
                var batchinput 	= $($clicked.data('options')),
                    batch 		= batchinput.val().split("\n"),
                    has_vals 	= false;
                for( var i = 0; i < batch.length; i ++){
                    var label = batch[i],
                        val = label,
                        parts = val.split('|');
                    if( parts.length > 1 ){
                        val = parts[0];
                        label = parts[1];
                        has_vals = true;
                    }
                    self.getStore().addFieldOption( fieldId, val, label );
                }
                $($clicked.data('options')).parent().hide();
                batchinput.val('');
                if( true === has_vals ){
                    $wrapper.find('.toggle_show_values').prop( 'checked', true );
                }else{
                    $wrapper.find('.toggle_show_values').prop( 'checked', false );
                }
                $toggleRows.empty();
            }else{
                self.getStore().addFieldOption( fieldId, false, false );
            }
            $('.preset_options').val('');

            renderOptions(fieldId);
            $wrapper.find('.toggle_show_values').trigger('change');


            $('.toggle-options').sortable({
                handle: ".dashicons-sort"
            });
            if(!batch){
                $toggleRows.find('.toggle_label_field').last().focus();
            }
        });
    }

    /**
     * Render a field config panel
     *
     * @since 1.5.1
     *
     *
     * @param $wrapper
     * @param fieldConfig
     */
    function renderFieldConfig( $wrapper, fieldConfig ) {
        var target			= $wrapper.find('.caldera-config-field-setup'),
            fieldType = fieldConfig.type,
            fieldId = fieldConfig.ID,
            template 		= getCompiledTemplate( fieldType );
        fieldConfig._id = fieldId;
        fieldConfig._name = 'config[fields][' + fieldId + '][config]';

        template = $('<div>').html( template( fieldConfig ) );

        // send to target
        target.html( template.html() );

        if( self.isStoreReady() && isSelect( fieldType )  ){
            setUpOptions($wrapper,fieldId);
        }else{
            $wrapper.find( '.caldera-config-group-toggle-options' ).remove();
        }

        // check for init function
        if( typeof window[fieldType + '_init'] === 'function' ){
            window[fieldType + '_init']( fieldId, target);
        }

        // remove not supported stuff
        var noSupportKey = fieldType + '_nosupport';
        if(fieldtype_defaults[noSupportKey]){

            if(fieldtype_defaults[noSupportKey].indexOf('hide_label') >= 0){
                $wrapper.find('.hide-label-field').hide().find('.field-config').prop('checked', false);
            }
            if(fieldtype_defaults[noSupportKey].indexOf('caption') >= 0){
                $wrapper.find('.caption-field').hide().find('.field-config').val('');
            }
            if(fieldtype_defaults[noSupportKey].indexOf('required') >= 0){
                $wrapper.find('.required-field').hide().find('.field-config').prop('checked', false);
            }
            if(fieldtype_defaults[noSupportKey].indexOf('custom_class') >= 0){
                $wrapper.find('.customclass-field').hide().find('.field-config').val('');
            }
            if(fieldtype_defaults[noSupportKey].indexOf('entry_list') >= 0){
                $wrapper.find('.entrylist-field').hide().find('.field-config').prop('checked', false);
            }
        }

        colorFieldsInit( $wrapper );

        if ( fieldConfig.hasOwnProperty( 'config' ) ) {
            var checkboxes = $wrapper.find('input:checkbox');
            if (checkboxes.length) {
                fieldConfig = self.getStore().getField(fieldId);
                var configType, $check;
                $.each(checkboxes, function (i, v) {
                    $check = $(v);
                    configType = $check.data('config-type');
                    if (configType) {
                        if (fieldConfig.config.hasOwnProperty(configType) && false == fieldConfig.config[configType]) {
                            //don't check
                        } else {
                            $check.prop('checked', true);
                        }
                    }

                });
            }
        }

        if( 'calculation' == self.getStore().getFieldType( fieldId ) ){
            calcField(fieldId, $wrapper );
        }

    }

    function colorFieldsInit($wrapper) {
        var colorFields = $wrapper.find( '.color-field' );
        if (colorFields.length) {
            colorFields.wpColorPicker({
                change: function (obj) {

                    var trigger = $(this);


                    if (trigger.data('ev')) {
                        clearTimeout(trigger.data('ev'));
                    }
                    trigger.data('ev', setTimeout(function () {
                        trigger.trigger('record');
                    }, 200));
                    if (trigger.data('target')) {
                        $(trigger.data('target')).css(trigger.data('style'), trigger.val());
                        $(trigger.data('target')).val(trigger.val());
                    }

                }
            });
        }
    }

    /**
     * Setup a calcualation field
     *
     * @since 1.5.1
     *
     * @param fieldId
     * @param $wrapper
     */
    function calcField( fieldId, $wrapper){

        var
            field = self.getStore().getField( fieldId ),
            $addGroupButton = $( '#' + fieldId + '_add_group'),
            $opGroups = $( '#' + fieldId + '_operator_groups' ),
            $fixedButton = $(  '#' + fieldId + '_fixed'),
            $manualButton = $( '#' + fieldId + '_manual' ),
            $autoBox = $( '#' + fieldId + '_autobox' ),
            $manualBox = $( '#' + fieldId + '_manualbox' ),
            $manualFormula = $( '#' + fieldId + '_manual_formula_input' ),
            $separator = $(  '#' + fieldId + '_thousand_separator'),
            formula = self.getStore().getFieldCalcFormula(fieldId ),
            $formular = $( '#' + fieldId + '_formular'),
            $build_formula = $( '#' + fieldId + '_config' );

        if( ! formula ){
            updateFormulaFromAuto();
        }

        if( ! field.config.hasOwnProperty( 'manual' ) || false == field.config.manual ){
            $manualButton.prop( 'checked', false );
        }
        //hide/show manual/auto box on first render
        typeBoxes($manualButton.prop('checked'));

        /**
         * Set formula in in DOM and store
         *
         * @since 1.5.0
         *
         * @param formula
         */
        function updateFormula(formula) {
            self.getStore().updateFieldCalcFormula(fieldId, formula);
            $formular.val(formula);
            var field = self.getStore().getField(fieldId);
            if( ! field.config.hasOwnProperty( 'config' ) ){
                $build_formula.val( JSON.stringify( {group: [] } ) );
            }else{
                $build_formula.val( JSON.stringify( field.config.config ) );

            }

        }

        /**
         * Build formuala form AutoBox (buildFormulaa() ) and update formula in store and DOM (updateFormula() )
         *
         * @since 1.5.1
         */
        function updateFormulaFromAuto() {
            var formula = buildFormuala();
            updateFormula(formula);
        }

        /**
         * Create formula from visual editor
         *
         * @since 1.5.1
         *
         * @returns {*}
         */
        function buildFormuala(){
            var lines = self.getStore().getFieldCalcGroups( fieldId );
            var newFormula = '';
            $.each( lines, function (i,lineGroups) {
                if( lineGroups.hasOwnProperty( 'operator' ) ){
                    newFormula += ' ' + lineGroups.operator + ' ';
                }else{
                    $.each(lineGroups, function (lI, lineGroup) {
                        newFormula += '(';
                        var line;
                        for (var lGI = 0; lGI <= lineGroup.length; lGI++) {
                            line = lineGroup[lGI];
                            if ('object' == typeof line) {

                                newFormula +=  line.operator + line.field;
                            }


                        }
                        newFormula += ')';
                    });
                }

            });
            return newFormula;
        }



        //add new line
        $autoBox.on( 'click', '.calculation-add-line', function () {
            var $this = $(this),
                $newLine = $this.prev().find('.calculation-group-line').last().clone(),
                group = $this.data( 'group' ),
                lineId = $newLine.data( 'line' ) + 1;

            $newLine.appendTo($this.prev());
            var newLine = self.getStore().newFieldCalcGroup( fieldId, group, lineId );
            $newLine.find('select').prepend( '<option />').val('').attr( 'data-group', group ).attr( 'data-line', lineId ).first().focus();
            $newLine.attr( 'data-group', group ).attr( 'data-line', lineId );
            $autoBox.find( '.calculation-operator-line[data-line="'+lineId+'"]' ).show().attr( 'aria-hidden', false );

        });

        //remove line
        $autoBox.on( 'click', '.remove-operator-line', function () {
            var $this = $(this),
                $parent = $this.parent(),
                groupId = $parent.data( 'group' ),
                lineId = $parent.data( 'line' );
            var group = self.getStore().removeFieldCalcLine( fieldId, groupId, lineId );
            //see if we need to remove operator
            if (0 === group.lines.length ) {
                var opGroupId = groupId + 1;
                self.getStore().removeFieldCalcGroup( fieldId, groupId );
                self.getStore().removeFieldCalcGroup( fieldId, opGroupId );
                $( '#op-group-' + opGroupId ).remove();
                $( '#calculation-group-' + groupId ).parent().remove();
            }

            
            $parent.remove();
        });

        //change  operator for line or operator group
        $autoBox.on( 'change', '.calculation-operator', function () {
            var $this = $(this),
                isLine = false,
                lineId = $this.data( 'line' ),
                groupId = $this.data( 'group' ),
                val = $this.val();

            if( $this.hasClass( 'calculation-operator-line'  ) ){
                self.getStore().updateFieldCalcLine( fieldId, groupId, lineId, 'operator', val );
            }else{
                self.getStore().updateFieldCalcOpGroup( fieldId, groupId, val );

            }
            updateFormulaFromAuto();

        });

        //change field for line
        $autoBox.on( 'change', '.calculation-operator-field', function () {
            var $this = $(this),
                groupId = $this.data( 'group'),
                lineId = $this.data( 'line' ),
                val = $this.val(),
                type = 'field';
            if( $this.hasClass( 'calculation-operator-line' ) ){
                type = 'operator';
            }
            self.getStore().updateFieldCalcLine( fieldId, groupId, lineId, type, val );
            updateFormulaFromAuto();
        });

        //add operator group
        $wrapper.on( 'click', '.add-operator-group', function () {
            self.getStore().addFieldCalcGroup( fieldId );
            //re-render (maybe later break up template into parts so this isn't needed
            visualCalcEditor(fieldId, $autoBox );
            updateFormulaFromAuto();
        });

        $fixedButton.on( 'change', function(e){
            var $checked = $(this);
            if($checked.prop('checked')){
                $separator.show().attr( 'aria-hidden', false );
            }else{
                $separator.hide().attr( 'aria-hidden', true );
            }
        });

        /**
         * Change hide/show of visual/manual builder based on conditionals
         *
         * @since 1.5.1
         *
         * @param checked
         */
        function typeBoxes(checked) {
            if (checked) {
                $autoBox.hide().attr( 'aria-hidden', false );
                $manualBox.show();
            } else {
                visualCalcEditor(fieldId, $autoBox);
                $autoBox.show();
                $manualBox.hide().attr( 'aria-hidden', true );
            }
        }

        //when manaul checkbox changes, update hide/show
        $manualButton.on( 'change', function () {
            typeBoxes($manualButton.prop('checked'));
        });

        //when manual formula changes update
        $manualFormula.on( 'change', function () {
            updateFormula( $manualFormula.val() );
        });


    }

    /**
     * Holds visual editor for calculation fields template
     *
     * @since 1.5.1
     */
    var calcTmpl;

    /**
     *
     * @param fieldId
     * @param $autoBox
     * @returns {*}
     */
    function visualCalcEditor(fieldId, $autoBox) {
        if( ! calcTmpl ){
            calcTmpl = Handlebars.compile( document.getElementById( 'calculator-group-tmpl' ).innerHTML );
        }
        var field = self.getStore().getField(fieldId);

        if (field) {
            var rendered = calcTmpl(field.config.config);

        }else{
            return false;
        }

        var list = optList(false);
        var $sel;

        $autoBox.html( rendered );
        $autoBox.find( '.calculation-operator-field' ).each(function (i,sel) {
            $sel = $(sel);
            optListSelect( $sel, list, $sel.data( 'default' ), false, fieldId );
        });

        $autoBox.find( '.calculation-operator-line[data-line="0"]' ).hide().attr( 'aria-hidden', true ).each( function(){
            $(this).find( 'option' ).prop( 'selected', '' );
        });
    }

    /**
     * Creates the option list of fields, system tags
     *
     * @since 1.5.1
     *
     * @TODO lazy-loader/not recreating -- need to have system for emptying when field added/removed first. Also for processors.
     *
     * @param includeSystem
     * @returns {{system: {}, fields: {}, variables: *}}
     */
    function optList(includeSystem){

        var list = {
            system: {},
            fields: {},
            variables: self.variables.getAll(),
            processors : {}
        },
            fields = self.getStore().getFields(),
            i = 0,
            field;

        for( var fieldId in fields ){
            field = self.getStore().getField( fieldId );
            list.fields[i] = {
                value: field.value,
                label: field.label,
                slug: field.slug,
                ID: field.ID
            };
            i++;

        }

        if ( includeSystem ) {
            var si = 0,
                sysTags = system_values.system.tags,
                sysBefore = system_values.system.wrap[0],
                sysAfter = system_values.system.wrap[1];
            for (var tag in sysTags) {
                sysTags[tag].forEach(function (text) {
                    list.system[si] = {
                        value: sysBefore + text + sysAfter,
                        label: sysBefore + text + sysAfter
                    };
                    si++;
                });

            }

            self.getCurrentProcessors().forEach(function (proccesor) {
                if (undefined != typeof  system_values[proccesor.type]) {
                    list.processors[proccesor.type] = {
                        name: proccesor.name,
                        tags: system_values[proccesor.type].tags
                    };
                }
            });
        }

        return list;
    }

    /**
     * Populate a selector setting with all fields and optionally system values
     *
     * @since 1.5.1
     *
     * @param $el Select EL
     * @param list List to parse
     * @param selected Default value
     * @param includeSystem To include system magic tags?
     * @param excludes fieldId as string or array of field IDs and system tags to exclude
     */
    function optListSelect($el, list, selected, includeSystem, excludes ) {
        if( 'string' == typeof  excludes ){
            excludes = [ excludes ];
        }

        $el.append( '<optgroup label="Fields">' );

        var field;
        for ( var i in list.fields ) {
            if( -1 === excludes.indexOf( list.fields[i].value ) ){
                field = self.getStore().getFieldSimple( list.fields[i].ID);
                $el.append($('<option>', {
                    value: field.ID,
                    text: field.label
                }));
            }

        }

        $el.append( '<optgroup label="Variables">' );

        list.variables.forEach(function( variable){
            $el.append($('<option>', {
                value: variable.name,
                text: 'Variable: ' +variable.name
            }));
        });



        if (includeSystem) {
            $el.append( '<optgroup label="System">' );
            for( var sysTag in list.system ){
                if( -1 === excludes.indexOf( list.system[sysTag] ) ) {
                    $el.append($('<option>', {
                        value: list.system[sysTag].value,
                        text: list.system[sysTag].label
                    }));
                }
            }


        }

        $el.val(selected);
    }
    


    /**
     * Create a field type config
     *
     * @since 1.5.1
     *
     * @param el
     */
    this.buildFieldTypeConfig = function(el){
        var select 			= $(el);
        var fieldId = select.data( 'field' );

        var fieldType = select.val(),
            $wrapper		= select.closest('.caldera-editor-field-config-wrapper'),
            target			= $wrapper.find('.caldera-config-field-setup'),
            template 		= getCompiledTemplate( fieldType ),
            config			= store.getField(fieldId),
            current_type	= select.data('type'),
            newField = false;

        $wrapper.find('.caldera-config-group').show();

        select.addClass('field-initialized');

        // Be sure to load the fields preset when switching back to the initial field type.
        if(config.length && current_type === select.val() ){
           // config = JSON.parse(config);
        }else{
            // default config
            newField = true;
            config = fieldtype_defaults[select.val() + '_cfg'];
        }

        // build template
        if(!config){
            newField = true;
        }

        if( newField ){
            config = store.addField(fieldId,fieldType);
        }

        renderFieldConfig( $wrapper, config );

        // setup options
        $wrapper.find('.toggle_show_values').trigger('change');

        if( !$('.caldera-select-field-type').not('.field-initialized').length){

            // build previews
            if(! $coreForm.hasClass('builder-loaded')){

                var fields = $('.caldera-select-field-type.field-initialized');
                for( var f = 0; f < fields.length; f++){
                    self.buildFieldPreview( $(fields[f]).data('field') );
                }
                $coreForm.addClass('builder-loaded');
            }else{
                self.buildFieldPreview( select.data('field') );
            }

            self.enableSubmit();
            rebuild_field_binding();
            baldrickTriggers();
        }


    };

    /**
     * Build field preview
     *
     * @since 1.5.1
     *
     * @param fieldId
     */
    this.buildFieldPreview = function(fieldId){
        var config = self.getStore().getField(fieldId);
        renderFieldPreview( fieldId,config );
    };

    /**
     * Check if store is ready
     *
     * @since 1.5.1
     *
     * @returns {boolean}
     */
    this.isStoreReady = function () {
        if ( 'object' == typeof store ){
            return true;
        }
        return false;
    };

    /**
     * Check if we should treat a type as a select
     *
     * @since 1.5.1
     *
     * @param type
     * @returns {boolean}
     */
    function isSelect(type) {
        if (-1 < [
            'color_picker',
            'filtered_select2',
            'radio',
            'dropdown',
            'checkbox'
        ].indexOf(type)) {
            return true;
        }

    }


    /**
     * Render the field preview
     *
     * @since 1.5.1
     *
     * @param fieldId
     * @param config
     */
    function renderFieldPreview( fieldId, config) {
        if( emptyObject( config ) ){
            config = self.getStore().getField( fieldId );
        }

        var
            type = self.getStore().getFieldType(fieldId),
            $preview_parent	= $('.layout-form-field[data-config="' + fieldId + '"]'),
            preview_target	= $preview_parent.find('.field_preview'),
            preview			= $('#preview-' + type + '_tmpl').html(),
            template 		= getCompiledTemplate( 'preview-' + type );
        preview_target.html(template(config));
        $preview_parent.removeClass('button');
        $preview_parent.find( ':input').prop( 'disabled', true );
        self.enableSubmit();
    }

    /**
     * Get jQuery object for config wrapper (the element wrapping field settings)
     *
     * @since 1.5.1
     *
     * @param fieldId
     * @returns {*|jQuery|HTMLElement}
     */
    function getFieldConfigWrapper( fieldId ){
        return $( '#' + fieldId )
    }

    function deleteField( fieldId ) {
        // remove config
        $('#' + field).remove();
        // remove options
        $('option[value="' + field + '"]').remove();
        $('[data-bind="' + field + '"]').remove();

        // remove field
        delete current_form_fields[field];
        self.getStore().deleteField(fieldId);

        $('[data-config="' + field + '"]').slideUp(200, function(){
            var line = $(this);
            // remove line
            line.remove();
            rebuild_field_binding();
            $(document).trigger('field.removed');
        });


    }


    /**
     * Setup click handlers for editor
     *
     * @since 1.5.1
     */
    function setUpClickHandlers() {
        //Save form
        $saveButton.baldrick({
            method: 'POST',
            request: 'admin.php?page=caldera-forms',
            before: self.saveForms().before,
            callback: self.saveForms().callback,
            complete: self.saveForms().complete,
        });

        // Change Field Type
        $editorBody.on('change', '.caldera-select-field-type', function (e) {
            if (!isSelect(self.getStore().getFieldType($(this).data('field')))) {
                self.buildFieldTypeConfig(this);
            }

        });

        //Change to settings
        $editorBody.on('change record', '.field-config', function (e) {
            if (!self.isStoreReady()) {
                return;
            }

            var $editField = $(this),
                $parent = $editField.closest('.caldera-editor-field-config-wrapper'),
                fieldId = $parent.prop('id'),
                editType = $editField.data('config-type'),
                newVal,
                updated;
            if (!editType) {
                return;
            } else if ('option-value' == editType || 'option-label' == editType || 'option-default' == editType) {
                editType = editType.replace('option-', '');
                if ('default' !== editType) {
                    newVal = $editField.val();
                } else {
                    newVal = $editField.prop('checked')
                }
                updated = self.getStore().updateFieldOption(fieldId, editType, $editField.data('option'), newVal);


            } else {
                if ('checkbox' == $editField.attr('type')) {
                    newVal = $editField.prop('checked');
                } else {
                    newVal = $editField.val();
                }

                updated = self.getStore().updateField(fieldId, editType, newVal);

            }

            if (updated) {
                renderFieldPreview(fieldId, updated);
            }

        });

        //Open field settings
        $(document).on('click', '.layout-form-field .icon-edit', function () {
            var $clicked = $(this);
            if ($clicked.hasClass('caldera-select-field-type')) {
                return;
            }
            var
                $panel = $clicked.parent(),
                type = $('#' + $panel.data('config') + '_type').val();

            if (self.isStoreReady()) {
                var config = $panel.data('config');
                if ('string' == typeof config) {
                    var $wrapper = getFieldConfigWrapper(config);
                    config = store.getField(config);
                    renderFieldConfig($wrapper, config);
                }

            }

            $('.caldera-editor-field-config-wrapper').hide();

            if ($panel.hasClass('field-edit-open')) {
                $panel.removeClass('field-edit-open');
            } else {
                $('.layout-form-field').removeClass('field-edit-open');
                $panel.addClass('field-edit-open');
                $('#' + $panel.data('config')).show();
            }

            $(document).trigger('show.' + $panel.data('config'));
            $(document).trigger('show.fieldedit');

            if (type === 'radio' || type === 'checkbox' || type === 'dropdown' || type === 'toggle_switch') {
                $('#' + $panel.data('config') + '_auto').trigger('change');
            }
        });

        //Field type change
        $editorBody.on('change record', '.caldera-select-field-type', function () {
            if (!self.isStoreReady()) {
                return;
            }

            var $this = $(this),
                config = self.getStore().getField($this.data('field')),
                newType = $this.val(),
                fieldId = $this.data('field'),
                opts = {};


                if( isSelect(self.getStore().getFieldType(fieldId) ) && isSelect( newType )){
                    opts = self.getStore().getFieldOptions(fieldId);
                }
                config = self.getStore().changeFieldType(fieldId, $this.val());
            if (config) {
                if ( ! emptyObject( opts ) ) {
                    config = self.getStore().updateFieldOptions(fieldId, opts);
                }
                renderFieldConfig($this.parent(), config);
                renderFieldPreview(fieldId, config);
            }
        });


        // remove an option row
        $('.caldera-editor-body').on('click', '.toggle-remove-option', function (e) {
            var $this = $(this);
            var $triggerfield = $(this).closest('.caldera-editor-field-config-wrapper').find('.field-config').first();
            var fieldId = $triggerfield.val();
            self.getStore().removeFieldOption(fieldId, $this.data('option'));
            $this.parent().remove();
            $triggerfield.trigger('change');
            $(document).trigger('option.remove');
            renderFieldPreview(fieldId, {});
        });

        //delete field
        $editorBody.on('click', '.delete-field', function () {
            var clicked = $(this),
                field = clicked.closest('.caldera-editor-field-config-wrapper').prop('id');

            if (!confirm(clicked.data('confirm'))) {
                return;
            }
            deleteField(fieldId);
        });

        $editorBody.on('keyup  focus select click init.magic', '.magic-tag-enabled', function(e) {
            var $input = $(this),
                includeSystem = true;
            if($input.parents('.caldera-editor-field-config-wrapper').length > 0) {
                includeSystem = false;
            }

            var $list = self.magicTagsUl(includeSystem),
                $wrap = $input.parent(),
                $wrapper = $( '<div class="magic-tags-autocomplete" style="display: none;"></div>' ),
                scrolling = false,
                remove = function () {
                    if( true === scrolling ){
                        return;
                    }
                    setTimeout(function(){
						$wrap.find( 'p' ).show().attr( 'aria-hidden', 'false' );
						$wrapper.slideUp(150);
                    }, 100 );
                    setTimeout(function(){
                        $wrapper.remove();
                    }, 300);
                };
            $wrapper.attr( 'data-active-tag', 'true' );
            $input.attr( 'data-active-tag', 'true' );
			$wrap.find( 'p' ).hide().attr( 'aria-hidden', 'true' );

            $wrap.append( $wrapper );
            //Yes slidedown is a little annoying, but it scrolls list into view
            $wrapper.append( $list ).slideDown(150);
            if(e.type === 'focusout'){
                remove();
            }
            $input.on( 'focusout', remove );
            $wrapper.find( 'li' ).on( 'click', function () {
                $input.val( $(this).data('tag'));
                remove();
            });

            $wrapper.on( 'scroll', function () {
                scrolling = true;
            });

            $wrapper.scrollEnd(function() {
                scrolling = false;
            },250);
        });


		//Add field to grid
		$( ".layout-column" ).droppable({
			greedy: true,
			activeClass: "ui-state-dropper",
			hoverClass: "ui-state-hoverable",
			accept: ".layout-new-form-field",
			drop: function( event, ui ) {
				self.newField( $(this) );
			}
		});
    }

    /**
     * Get a compiled Handlebars template or the fallback template
     *
     * @since 1.5.1
     *
     * @param template
     * @returns {*}
     */
    function getCompiledTemplate( template ) {
        if ( emptyObject( compiledTemplates) ) {
			var pretemplates = $('.cf-editor-template');
			for( var t = 0; t < pretemplates.length; t++){
				if( null != pretemplates[t] ){
					compiledTemplatesList[pretemplates[t].id] = pretemplates[t].innerHTML;
				}
			}
        }

        var key =  template + '_tmpl';
		if (has( compiledTemplates, key)) {
            return compiledTemplates[key];
		}else if ( -1 !== compiledTemplatesList.hasOwnProperty(key) ) {
			compiledTemplates[key] = Handlebars.compile(compiledTemplatesList[key] );
			delete compiledTemplatesList[key];
			return compiledTemplates[key];
        }else{
			return compiledTemplates.noconfig_field_templ;

		}

    }

    /**
     * Holds the compiled template for options sections
     *
     * Don't call directly, use getOptRowTmpl() which lazy-loads it
     *
     * @since 1.5.1
     */
    var optTmpl;

    /**
     * Get option row template
     *
     * Acts as lazy-loader for compilation
     *
     * @since 1.5.1
     *
     * @returns {*}
     */
    function getOptRowTmpl() {
        if (!optTmpl) {
            optTmpl = Handlebars.compile(document.getElementById('field-option-row-tmpl').innerHTML);
        }

        return optTmpl;
    }

    /**
     * Render options sections
     *
     * @since 1.5.1
     *
     * @param fieldId
     */
    function renderOptions(fieldId ) {
        var optTmpl = getOptRowTmpl();

        var el =  document.getElementById( 'field-options-' + fieldId );
        if( null != el ){
            el.innerHTML = optTmpl(self.getStore().getField( fieldId ));
        }else{
            throw Error( 'Field options wrapper for options not found. field-options-' + fieldId  );
        }

    }

   

    /**
     * Check if object has a key
     *
     * @since 1.5.1
     *
     * @param object
     * @param key
     * @returns {boolean}
     */
    function has(object, key) {
        return object ? hasOwnProperty.call(object, key) : false;
    }

    /**
     * Check if is empty object
     *
     * @since 1.5.1
     *
     * @param obj
     * @returns {boolean}
    */
    function emptyObject(obj) {
        return Object.keys(obj).length === 0 && obj.constructor === Object;
    }

    /**
     * Form Variables
     *
     * For now pulls of of DOM.
     *
     * @todo Use form store for variables
     *
     * @since 1.5.1
     *
     * @type {{self: CFFormEditor, findAll: CFFormEditor.variables.findAll, getAll: CFFormEditor.variables.getAll, getType: CFFormEditor.variables.getType, getName: CFFormEditor.variables.getName, getValue: CFFormEditor.variables.getValue}}
     */
    this.variables = {
        self: this,
        /**
         * Collect all form variables in an array
         *
         *
         *
         * @returns {Array}
         */
        getAll: function () {
            var variables = [],
                $variable,
                $variables = this.findAll();
            for (var i = 0; i <= $variables.length; i++) {
                $variable = $($variables[i]);
                variables.push({
                    name: this.getName($variable),
                    type: this.getType($variable),
                    value: this.getValue($variable),
                });
            }
            return variables;
        },
        /**
         * Get all form variables from DOM jQuery
         *
         * @since 1.5.1
         *
         * @returns {*|jQuery|HTMLElement}
         */
        findAll: function () {
            return $( '.cf-variable' );
        },
        /**
         * Get variable type from jQuery
         *
         * @since 1.5.1
         *
         * @param $variable
         * @returns {*}
         */
        getType: function ( $variable) {
            return $variable.find( '.cf-variable-type' ).val();
        },
        /**
         * Get variable name from jQuery
         *
         * @since 1.5.1
         *
         * @param $variable
         * @returns {*}
         */
        getName: function ( $variable ) {
            return $variable.find( '.cf-variable-name' ).val();
        },
        /**
         * Get variable value from jQuery
         *
         * @since 1.5.1
         *
         * @param $variable
         * @returns {*}
         */
        getValue: function ( $variable ) {
            return $variable.find( '.cf-variable-value' ).val();
        }
    };

}


/* contains edit.js, layout-grid.js, processors.js */
function new_conditional_group(obj){

    var id 	  	=	obj.trigger.data('id'),
        lineid 	=	'cl' + Math.round(Math.random() * 18746582734),
        rowid	=	'rw' + Math.round(Math.random() * 98347598345),
        group 	=	[
            {
                id		:	rowid,
                type	:	obj.trigger.data('type'),
                lines	:	[
                    {
                        id	:	lineid
                    }
                ]
            }
        ];


    return {group : group, id: id};
}
function new_conditional_line(obj){

    var id 	  	=	obj.trigger.data('id'),
        rowid 	=	obj.trigger.data('group'),
        type 	=	obj.trigger.data('type'),
        lineid	=	'cl' + Math.round(Math.random() * 18746582734),
        line 	=	{
            id		:	id,
            type	:	type,
            lineid	:	lineid,
            rowid	:	rowid,
            name	:	"config[" + type + "][" + id + "][conditions][group][" + rowid + "][" + lineid + "]"
        };

    return line;
}

function build_conditions_config(obj){
    var config = JSON.parse(obj.trigger.val());
    config.id = obj.trigger.data('id');

    return config;

}

var cfAdminAJAX;
if( 'object' == typeof  CF_ADMIN ){
    cfAdminAJAX = CF_ADMIN.adminAjax;
} else {
    //yolo
    cfAdminAJAX = ajaxurl;
}


jQuery(document).ready(function($){
    var theEditor;
    if ( 'object' == typeof CF_FORM_EDITOR ) {
        theEditor = new CFFormEditor( CF_FORM_EDITOR, $  );
        theEditor.init();
    }else{
        alert( ':(' );
    }

    // switch active group
    function switch_active_group(id){
        var fields_panel	= $('.caldera-editor-fields-panel'),
            groups_panel	= $('.caldera-editor-groups-panel'),
            group_navs		= $('.caldera-group-nav'),
            group_line		= $('[data-group="'+ id +'"]'),
            group_name		= group_line.find('.caldera-config-group-name'),
            group_slug		= group_line.find('.caldera-config-group-slug'),
            group_desc		= group_line.find('.caldera-config-group-desc'),
            group_admin		= group_line.find('.caldera-config-group-admin'),
            group_name_edit	= $('.active-group-name'),
            group_slug_edit	= $('.active-group-slug'),
            group_desc_edit	= $('.active-group-desc'),
            group_admin_edit= $('.active-group-admin'),
            field_lists		= $('.caldera-editor-fields-list ul'),
            group_repeat	= group_line.find('.caldera-config-group-repeat'),
            repeat_button	= $('.repeat-config-button'),
            group_settings	= $('.caldera-editor-group-settings'),
            deleter 		= $('.caldera-config-group-remove'),
            group_field_lists;

        // remove any hdden fields
        $('.new-group-input').remove();
        $('.new-field-input').remove();


        // remove current active group
        group_navs.removeClass('active');

        // show fields panel
        fields_panel.show();

        // hide all groups
        field_lists.hide();

        // remove active field
        field_lists.removeClass('active').find('li.active').removeClass('active');
        field_lists.hide();

        // set active group
        group_line.addClass('active');

        // hide delete button or show
        group_field_lists = $('.caldera-editor-fields-list ul.active li');

        if(group_field_lists.length){
            // has fields
            deleter.hide();
        }else{
            deleter.show();
        }


        // hide all field configs
        $('.caldera-editor-field-config-wrapper').hide();

        // show groups fields
        group_line.show();

        // set group name edit field
        group_name_edit.val(group_name.val());

        // set group slug edit field
        group_slug_edit.val(group_slug.val());

        // set group slug edit field
        group_desc_edit.val(group_desc.val());

        // set group admin edit field
        if(group_admin.val() === '1'){
            group_admin_edit.prop('checked', true);
        }else{
            group_admin_edit.prop('checked', false);
        }




        // is repeatable
        if(group_repeat.val() === '1'){
            repeat_button.addClass('field-edit-open');
        }else{
            repeat_button.removeClass('field-edit-open');
        }


    }

    // tabs button
    $('body').on('click', '.toggle_processor_event input', function(e){
        var clicked = $(this),
            parent = clicked.closest( '.wrapper-instance-pane' ),
            settings = parent.find('.caldera-config-processor-setup'),
            notice = parent.find('.caldera-config-processor-notice');


        if( clicked.is(':checked') ){
            clicked.parent().addClass('activated');
            clicked.parent().find('.is_active').show().attr( 'aria-hidden', false ).css( 'visibility', 'visible' );
            clicked.parent().find('.not_active').hide().attr( 'aria-hidden', true ).css( 'visibility', 'hidden' );
        }else{
            clicked.parent().removeClass('activated');
            clicked.parent().find('.is_active').hide().attr( 'aria-hidden', true ).css( 'visibility', 'hidden' );
            clicked.parent().find('.not_active').show().attr( 'aria-hidden', false ).css( 'visibility', 'visible' );
        }

        // check if all are selected
        if( parent.find('.toggle_processor_event .activated').length ){
            settings.slideDown(100);
            notice.slideUp(100);
        }else{
            settings.slideUp(100);
            notice.slideDown(100);
        }

    });
    $('body').on('click', '.toggle_option_tab > a', function(e){

        e.preventDefault();
        var clicked = $(this),
            panel = $(clicked.attr('href')),
            tabs = clicked.parent().find('a'),
            panels = clicked.closest('.caldera-editor-config-wrapper').find('.wrapper-instance-pane');

        tabs.removeClass('button-primary');

        panels.hide();
        panel.show();
        clicked.addClass('button-primary');
        $('.caldera-conditionals-usetype').trigger('change');
    });



    // build group navigation
    $('.caldera-editor-body').on('click', '.caldera-group-nav a', function(e){

        // stop link
        e.preventDefault();

        //switch group
        switch_active_group( $(this).attr('href').substr(1) );

    });

    // build field navigation
    $('.caldera-editor-body').on('click', '.caldera-editor-fields-list a', function(e){

        // stop link
        e.preventDefault();

        var clicked 		= $(this),
            field_config	= $( clicked.attr('href') );

        // remove any hdden fields
        $('.new-group-input').remove();
        $('.new-field-input').remove();


        // remove active field
        $('.caldera-editor-fields-list li.active').removeClass('active');

        // mark active
        clicked.parent().addClass('active');

        // hide all field configs
        $('.caldera-editor-field-config-wrapper').hide();

        // show field config
        field_config.show();

    });

    // bind show group config panel
    $('.caldera-editor-body').on('click', '.group-config-button', function(e){
        var clicked = $(this),
            group_settings	= $('.caldera-editor-group-settings'),
            parent = clicked.closest('.caldera-editor-fields-panel'),
            deleter = $('.caldera-config-group-remove');

        // check if children
        if(parent.find('.caldera-field-line').length){
            // has fields
            deleter.hide();
        }else{
            deleter.show();
        }

        if(clicked.hasClass('field-edit-open')){
            // show config
            group_settings.slideUp(100);
            clicked.removeClass('field-edit-open');
        }else{
            // hide config
            group_settings.slideDown(100);
            clicked.addClass('field-edit-open');
        }


    });
    $('.caldera-editor-body').on('keydown', '.field-config', function(e){
        if($(this).is('textarea')){
            return;
        }
        if(e.which === 13){
            e.preventDefault();
        }
    });
    // field label bind
    $('.caldera-editor-body').on('change', '.field-label', function(e){
        var field 		= $(this).closest('.caldera-editor-field-config-wrapper').prop('id');
        field_line	= $('[data-field="' + field + '"]'),
            field_title	= $('#' + field + ' .caldera-editor-field-title, .layout-form-field.field-edit-open .layout_field_name'),
            slug		= $('#' + field + ' .field-slug');

        field_line.find('a').html( '<i class="icn-field"></i> ' + this.value );
        field_title.text( this.value );
        if(e.type === 'change'){
            slug.trigger('change');
        }
        rebuild_field_binding();
    });


    // rename group
    $('.caldera-editor-body').on('change', '.active-group-name', function(e){
        e.preventDefault();
        var active_group		= $('.caldera-group-nav.active'),
            group				= active_group.data('group'),
            group_name			= active_group.find('.caldera-config-group-name'),
            group_label			= active_group.find('span');

        // check its not blank
        if(e.type === 'focusout' && !this.value.length){
            this.value = 'Group ' + ( parseInt( active_group.index() ) + 1 );
        }


        group_name.val(this.value);
        group_label.text(this.value);

    });
    // rename group slug
    $('.caldera-editor-body').on('change', '.active-group-slug', function(e){
        e.preventDefault();

        var active_group		= $('.caldera-group-nav.active'),
            group				= active_group.data('group'),
            group_name			= active_group.find('.caldera-config-group-name').val(),
            group_slug			= active_group.find('.caldera-config-group-slug'),
            group_label			= active_group.find('span'),
            slug_sanitized		= this.value.split(' ').join('_').split('-').join('_').replace(/[^a-z0-9_]/gi, '').toLowerCase();

        // check its not blank
        if(e.type === 'focusout' && !this.value.length){
            slug_sanitized = group_name.split(' ').join('_').split('-').join('_').replace(/[^a-z0-9_]/gi, '').toLowerCase();
        }

        group_slug.val(slug_sanitized);
        this.value = slug_sanitized;

    });
    // rename group description
    $('.caldera-editor-body').on('change', '.active-group-desc', function(e){
        e.preventDefault();

        var active_group		= $('.caldera-group-nav.active'),
            group				= active_group.data('group'),
            group_desc			= active_group.find('.caldera-config-group-desc');

        group_desc.val(this.value);

    });

    // set group admin
    $('.caldera-editor-body').on('change', '.active-group-admin', function(e){
        e.preventDefault();

        var active_group		= $('.caldera-group-nav.active'),
            group				= active_group.data('group'),
            group_name			= active_group.find('.caldera-config-group-name').val(),
            group_admin			= active_group.find('.caldera-config-group-admin'),
            group_label			= active_group.find('span'),
            slug_sanitized		= this.value.split(' ').join('_').split('-').join('_').replace(/[^a-z0-9_]/gi, '').toLowerCase();

        // check its not blank
        if($(this).prop('checked')){
            group_admin.val(1);
            active_group.addClass('is-admin');
        }else{
            group_admin.val(0);
            active_group.removeClass('is-admin');
        }

    });

    // set repeatable
    $('.caldera-editor-body').on('click', '.repeat-config-button', function(e){
        e.preventDefault();
        var active_group		= $('.caldera-group-nav.active'),
            group				= active_group.data('group'),
            icon				= active_group.find('a .group-type'),
            group_repeat		= active_group.find('.caldera-config-group-repeat'),
            clicked				= $(this);

        if(clicked.hasClass('field-edit-open')){
            // set static
            group_repeat.val('0');
            icon.removeClass('icn-repeat').addClass('icn-folder');
            clicked.removeClass('field-edit-open');
        }else{
            // set repeat
            group_repeat.val('1');
            icon.addClass('icn-repeat').removeClass('icn-folder');
            clicked.addClass('field-edit-open');
        }

    });



    // bind add new group button
    $('.caldera-editor-body').on('click', '.add-new-group,.add-field', function(){

        var clicked		= $(this);

        // remove any hdden fields
        $('.new-group-input').remove();
        $('.new-field-input').remove();

        if( clicked.hasClass( 'add-field' ) ){
            var field_input = $('<input type="text" class="new-field-input block-input">');
            field_input.appendTo( $('.caldera-editor-fields-list ul.active') ).focus();
        }else{
            var group_input = $('<input type="text" class="new-group-input block-input">');
            group_input.appendTo( $('.caldera-editor-groups-panel') ).focus();
        }

    });

    // dynamic group creation
    $('.caldera-editor-body').on('change keypress', '.new-group-input', function(e){

        if(e.type === 'keypress'){
            if(e.which === 13){
                e.preventDefault();
            }else{
                return;
            }
        }


        var group_name 	= this.value,
            input		= $(this),
            wrap		= $('.caldera-editor-groups-panel ul'),
            field_list	= $('.caldera-editor-fields-list'),
            new_templ,
            new_group;

        if( !group_name.length ){
            // no name- just remove the input
            input.remove();
        }else{
            new_templ = Handlebars.compile( $('#caldera_group_line_templ').html() );
            new_group = {
                "id"	:	group_name.split(' ').join('_').split('-').join('_').replace(/[^a-z0-9_]/gi, '').toLowerCase(),
                "name"	:	group_name,
            };

            // place new group line
            wrap.append( new_templ( new_group ) );

            // create field list
            var new_list = $('<ul data-group="' + new_group.id + '">').hide();

            // place list in fields list
            new_list.appendTo( field_list );

            // init sorting


            // remove input
            input.remove();

            // swtich to new group
            switch_active_group( new_group.id );
        }

    });

    // dynamic field creation
    $('.caldera-editor-body').on('change keypress', '.new-field-input', function(e){

        if(e.type === 'keypress'){
            if(e.which === 13){
                e.preventDefault();
            }else{
                return;
            }
        }


        var new_name 	= this.value,
            input		= $(this),
            wrap		= input.parent(),
            field_conf	= $('.caldera-editor-field-config'),
            new_templ,
            new_conf_templ,
            new_field,
            deleter = $('.caldera-config-group-remove');

        if( !new_name.length ){
            // no name- just remove the input
            input.remove();
        }else{
            // hide delete group
            deleter.hide();
            // field line template
            new_templ = Handlebars.compile( $('#caldera_field_line_templ').html() );
            // field conf template
            new_conf_templ = Handlebars.compile( $('#caldera_field_config_wrapper_templ').html() );

            new_field = {
                "id"	:	new_name.split(' ').join('_').split('-').join('_').replace(/[^a-z0-9_]/gi, '').toLowerCase(),
                "label"	:	new_name,
                "slug"	:	new_name.split(' ').join('_').split('-').join('_').replace(/[^a-z0-9_]/gi, '').toLowerCase(),
                "group"	:	$('.caldera-group-nav.active').data('group')
            };

            var field = $(new_templ( new_field ));

            // place new field line
            field.appendTo( wrap );
            // pance new conf template
            field_conf.append( new_conf_templ( new_field ) );

            // load field
            field.find('a').trigger('click');

            // remove input
            input.remove();

        }

    });

    // bind slug editing to keep clean
    $('.caldera-editor-body').on('change', '.field-slug', function(e){
        if(this.value.length){
            this.value = this.value.split(' ').join('_').split('-').join('_').replace(/[^a-z0-9_]/gi, '').toLowerCase();
        }else{
            if(e.type === 'change'){
                this.value = $(this).closest('.caldera-editor-field-config-wrapper').find('.field-label').val().split(' ').join('_').split('-').join('_').replace(/[^a-z0-9_]/gi, '').toLowerCase();
            }
        }
    });

    // bind add group button
    $('.caldera-editor-body').on('click', '.caldera-add-group', function(e){

        var clicked 	= $(this),
            group		= clicked.data('group'),
            template	= $('#' + group + '_panel_tmpl').html();

        clicked.parent().parent().append(template);

    });
    // bind remove group button
    $('.caldera-editor-body').on('click', '.caldera-config-group-remove', function(e){

        var group = $('.active-group-slug').val();

        $('[data-group="' + group + '"]').hide(0, function(){
            $(this).remove();
            var navs = $('.caldera-group-nav');

            if(navs.length){
                navs.first().find('a').trigger('click');
            }else{
                $('.caldera-editor-fields-panel').hide();
            }
        });

    });

    $('body').on('click', '.set-current-field', function(e){

        e.preventDefault();

        var clicked = $(this);

        $('#' + clicked.data('field') + '_type').val(clicked.data('type')).trigger('change');

        $('#' + clicked.data('field') + '_lable').focus()

        $('#field_setup_baldrickModalCloser').trigger('click');


    });


    $('.caldera-editor-body').on('focus', '.caldera-field-bind', function(e){
        var field = $(this),
            value = this.value;

        if(e.type && e.type === 'focusin'){
            field.removeClass('bound_field').addClass('reload-binding');
            this.value = value;
            return;
        }
    });

    $('.caldera-editor-body').on('change', '.caldera-conditional-field-set', function(e){

        var field = $(this),
            field_compare = field.parent().find('.compare-type'),
            type = field.data('condition'),
            pid = field.data('id'),
            name = "config[" + type + "][" + pid + "][conditions][group][" + field.data('row') + "][" + field.data('line') + "]",
            lineid = field.data('line'),
            target = $('#' + lineid + "_value"),
            curval = target.find('.caldera-conditional-value-field').first(),
            field_wrapper,
            is_button,
            options_wrap = [];

        var field_id = this.value;
        if( field_id.substr(0,1) !== '{' ){
            field_wrapper = $('#' + field_id);
            is_button = field_wrapper.find( '.field-button-type' );
            options_wrap = field_wrapper.find('.caldera-config-group-toggle-options');
        }
        if(field.hasClass('.bind_init')){
            field.addClass('bound_triggered');
        }
        // check if a value is present
        if(curval.length){
            if(curval.val().length){
                target.data('value', curval.val());

            }
        }
        field_compare.show();
        if(options_wrap.length){
            var options_rows = options_wrap.find('.toggle_option_row'),
                out = '<select name="' + name + '[value]" class="caldera-processor-value-bind caldera-conditional-value-field" data-field="' + field_id + '" style="max-width: 220px; width: 220px;">';
            out += '<option value=""></option>';

            options_rows.each(function(k,v){
                var label = $(v).find('.toggle_label_field'),
                    value = label.data('option'),
                    sel = '';

                if(target.data('value')){
                    if(target.data('value').toString() === value || target.data('value').toString() === $(v).find('.toggle_value_field').val() ){
                        sel = ' selected="selected"';
                    }
                }

                out += '<option value="' + value + '"' + sel + '>' + label.val() + '</option>';
            })

            out += '</select>';

        }else if( is_button && is_button.val() == 'button' ) {

            field_compare.val('is').hide();


            out = '<select name="' + name + '[value]" class="caldera-processor-value-bind caldera-conditional-value-field" data-field="' + field_id + '" style="max-width: 220px; width: 220px;">';
            out += '<option value="click" ' + ( target.data( 'value' ) === 'click' ? 'selected="selected"' : '' ) + '>Click</option>';
            out += '<option value="dblclick" ' + ( target.data( 'value' ) === 'dblclick' ? 'selected="selected"' : '' ) + '>Double Click</option>';
            out += '</select>';

        }else{
            out = '<input name="' + name + '[value]" type="text" class="caldera-conditional-value-field magic-tag-enabled" value="' + (target.data('value') ? target.data('value') : '') + '" style="max-width: 205px;">';
        }


        target.html(out);
        init_magic_tags();

    });


    $('.caldera-editor-body').on('change', '.caldera-conditionals-usetype', function(e){

        var select = $(this);

        if( this.value === 'show' || this.value === 'hide' || this.value === 'disable' || this.value === 'use' || this.value === 'not' ){
            $('#' + select.data('id') + '_condition_group_add').show();
            $('#' + select.data('id') + '_conditional_wrap').show();
        }else{
            $('#' + select.data('id') + '_condition_group_add').hide();
            $('#' + select.data('id') + '_conditional_wrap').hide();
        }

    });
    // conditionals
    $('.caldera-editor-body').on('click', '.remove-conditional-line', function(e){
        e.preventDefault();
        var clicked = $(this),
            line = clicked.closest('.caldera-condition-line'),
            group = clicked.closest('.caldera-condition-group');

        line.remove();
        if(!group.find('.caldera-condition-line').length){
            group.remove();
        }

    });


    // load fist  group
    $('.caldera-group-nav').first().find('a').trigger('click');

    // toggle set values
    $('.caldera-editor-body').on('change', '.toggle_show_values', function(e){
        var clicked = $(this),
            wrap = clicked.closest('.caldera-config-group-toggle-options');
        values = wrap.find('.toggle_value_field'),
            lables = wrap.find('.toggle_label_field'),
            field_lables = wrap.find('.caldera-config-group-option-labels');

        if(!clicked.prop('checked')){
            values.hide().parent().hide();
            lables.css('width', 245);
            field_lables.hide();
        }else{
            values.show().parent().show();
            values.show().parent().parent().show();
            lables.css('width', '');
            field_lables.show();
        }

        lables.trigger('toggle.values');
        init_magic_tags();

    });

    // autopopulate
    $('.caldera-editor-body').on('change', '.auto-populate-type', function(){
        $(this).closest('.wrapper-instance-pane').find('.auto-populate-options').trigger('change');
    });
    $('.caldera-editor-body').on('change', '.auto-populate-options', function(){
        var clicked 	= $(this),
            wrap		= clicked.closest('.wrapper-instance-pane'),
            manual		= wrap.find('.caldera-config-group-toggle-options'),
            autotype_wrap 	= wrap.find('.caldera-config-group-auto-options'),
            autotype		= autotype_wrap.find('.auto-populate-type');

        autotype_wrap.find('.auto-populate-type-panel').hide();

        if(clicked.prop('checked')){
            manual.hide();
            autotype_wrap.show();
        }else{
            manual.show();
            autotype_wrap.hide();
        }

        autotype_wrap.find('.caldera-config-group-auto-' + autotype.val()).show();

    });

    $('body').on('change', '.pin-toggle-roles', function(){

        var clicked = $(this),
            roles = $('#caldera-pin-rules');

        if( clicked.val() === '1' ){
            roles.show();
        }else{
            roles.hide();
        }

    });

    $('body').on('click', '.magic-tag-init', function(e){
        var clicked = $(this),
            input = clicked.prev();

        input.focus().trigger('init.magic');

    });



});

var rebuild_field_binding,
    rebind_field_bindings,
    current_form_fields = {},
    required_errors = {},
    add_new_grid_page,
    add_page_grid,
    init_magic_tags,
    core_form,
    compiled_templates = {};

/**
 * @deprecated 1.5.1
 * Josh - Don't remove.
 */
init_magic_tags = function(){
    return;
};
/**
 * @deprecated 1.5.1
 * Josh - Don't remove.
 */
rebuild_field_binding = function(){
    return;
};
/**
 * @deprecated 1.5.1
 * Josh - Don't remove.
 */
rebind_field_bindings = function(){
    return;
};

function setup_field_type(obj){

    return {'id' : obj.trigger.prop('id')};
}



function check_required_bindings(el){

    var fields,
        savebutton = jQuery('.caldera-header-save-button'),
        field_elements = jQuery('.layout-form-field'),
        nav_elements = jQuery('.caldera-processor-nav'),
        all_clear = true;

    if(el){
        fields = jQuery(el);
    }else{
        fields = jQuery('.caldera-config-field .required');
    }

    fields.removeClass('has-error');
    field_elements.removeClass('has-error');
    nav_elements.removeClass('has-error');

    jQuery('.error-tag').remove();
    //reset list
    required_errors = {};

    fields.each(function(k,v){
        var field = jQuery(v),
            panel = field.closest('.caldera-config-editor-panel');

        if(!v.value.length){
            if(!required_errors[panel.prop('id')]){
                required_errors[panel.prop('id')] = 0;
            }

            var is_field = field.closest('.caldera-editor-field-config-wrapper'),
                is_process = field.closest('.caldera-editor-processor-config-wrapper');

            if(is_field.length){
                jQuery('.layout-form-field[data-config="'+is_field.prop('id')+'"]').addClass('has-error');
            }
            if(is_process.length){
                jQuery('.'+is_process.prop('id')).addClass('has-error');
            }
            required_errors[panel.prop('id')] += 1;
            field.addClass('has-error');

            all_clear = false;

        }else{
            //unique
            if( field.hasClass('field-slug') ){
                var slugs = jQuery('.field-slug').not(field);

                for(var s = 0; s < slugs.length; s++){
                    if( slugs[s].value === v.value ){
                        var field = jQuery(slugs[s]);

                        if(!required_errors[panel.prop('id')]){
                            required_errors[panel.prop('id')] = 0;
                        }
                        var is_field = field.closest('.caldera-editor-field-config-wrapper'),
                            is_process = field.closest('.caldera-editor-processor-config-wrapper');

                        if(is_field.length){
                            jQuery('.layout-form-field[data-config="'+is_field.prop('id')+'"]').addClass('has-error');
                        }
                        if(is_process.length){
                            jQuery('.'+is_process.prop('id')).addClass('has-error');
                        }
                        required_errors[panel.prop('id')] += 1;
                        field.addClass('has-error');
                        all_clear = false;
                        break;
                    }
                };
            }
            if( field.hasClass('toggle_value_field') ){
                var vals = field.closest('.caldera-config-group').find('.toggle_value_field').not(field);

                for(var s = 0; s < vals.length; s++){
                    if( vals[s].value === v.value ){
                        var field = jQuery(vals[s]);

                        if(!required_errors[panel.prop('id')]){
                            required_errors[panel.prop('id')] = 0;
                        }
                        var is_field = field.closest('.caldera-editor-field-config-wrapper'),
                            is_process = field.closest('.caldera-editor-processor-config-wrapper');

                        if(is_field.length){
                            jQuery('.layout-form-field[data-config="'+is_field.prop('id')+'"]').addClass('has-error');
                        }
                        if(is_process.length){
                            jQuery('.'+is_process.prop('id')).addClass('has-error');
                        }
                        required_errors[panel.prop('id')] += 1;
                        field.addClass('has-error');
                        all_clear = false;
                        break;
                    }
                };
            }
        }
    });

    for(var t in required_errors){
        jQuery('.caldera-forms-options-form').find('a[href="#' + t + '"]').append('<span class="error-tag">' + required_errors[t] + '</span>');
    }

    jQuery('.caldera-conditional-field-set').trigger('change');

    return all_clear;
}

jQuery(document).ready(function($) {

    add_new_grid_page = function(obj){
        return { "page_no" : "pg_" + Math.round( Math.random() * 10000000 ) };
    }

    add_page_grid = function(obj){
        var btn_count = $('.page-toggle').length + 1,
            button = $('<button type="button" data-name="Page ' + btn_count + '" data-page="' + obj.rawData.page_no + '" class="page-toggle button">' + obj.params.trigger.data('addtitle') + ' ' + btn_count + '</button> '),
            option_tab = $('#page-toggles');
        button.appendTo( option_tab );
        option_tab.show();
        buildSortables();
        button.trigger('click');
        if( btn_count === 1){
            option_tab.hide();
        }
        $(document).trigger('add.page');
    }

// bind pages tab
    $(document).on('remove.page add.page load.page', function(e){
        var btn_count = $('.page-toggle').length,
            pages_tab = $('#tab_pages');

        if(btn_count <= 1){
            pages_tab.hide();
        }else{
            pages_tab.show();
        }


    });

    function buildLayoutString(){
        var grid_panels = $('.layout-grid-panel'),
            row_index = 0;

        grid_panels.each(function(pk,pv){

            var panel= $(pv),
                capt = panel.find('.layout-structure'),
                rows = panel.find('.row'),
                struct = [];

            rows.each(function(k,v){
                var row = $(v),
                    cols = row.children().not('.column-merge'),
                    rowcols = [];
                row_index += 1;
                cols.each(function(p, c){
                    span = $(c).attr('class').split('-');
                    rowcols.push(span[2]);
                    var fields = $(c).find('.field-location');
                    if(fields.length){
                        fields.each(function(x,f){
                            var field = $(f);
                            field.val( row_index + ':' + (p+1) ).removeAttr('disabled');
                        });
                    }
                    // set name

                });
                struct.push(rowcols.join(':'));
            });
            capt.val(struct.join('|'));
        });
    }

    function insert_new_field(newfield, target, field_default){
    	return theEditor.newField(target);
		return;
        var name = "fld_" + Math.round( Math.random() * 10000000 ),
            new_name 	= name,
            field_conf	= $('#field_config_panels'),
            new_conf_templ,
            field_set;

        newfield.prop('id', '').prop('title', '');

        // field conf template
        new_conf_templ = Handlebars.compile( $('#caldera_field_config_wrapper_templ').html() );

        field_set = $.extend({},{
            "id"	:	new_name,
            "label"	:	'',
            "slug"	:	''
        }, field_default );
        // reset slug to blank
        field_set.slug = '';
        // pance new conf template
        field_conf.append( new_conf_templ( field_set ) );

        newfield.
        removeClass('button-small').
        removeClass('button').
        removeClass('button-primary').
        removeClass('ui-draggable').
        removeClass('layout-new-form-field').
        addClass('layout-form-field').
        attr('data-config', name).css({ 'display' : '', 'opacity' : '' });

        newfield.find('.layout_field_name').remove();
        newfield.find('.field-location').prop('name', 'config[layout_grid][fields][' + name + ']');
        newfield.find('.settings-panel').show();
        newfield.appendTo( target );
        buildSortables();
        newfield.find('.icon-edit').trigger('click');


        $('#' + name + '_lable').focus().select();
        baldrickTriggers();
        $(document).trigger('field.added');
        if( field_default ){
            $('#' + new_name + '_type' ).data('type', field_set.type ).trigger('change');
        }else{
            $('#' + name).trigger('field.drop');
        }
        rebuild_field_binding();

    }

    function buildSortables(){

        // Sortables
        $('.toggle-options').sortable({
            handle: ".dashicons-sort",
        });


        $( "#grid-pages-panel" ).sortable({
            placeholder: 	"row-drop-helper",
            handle: 		".sort-handle",
            items:			".first-row-level",
            axis: 			"y",
            stop: function(){
                buildLayoutString();
            }
        });
        $( ".layout-column" ).sortable({
            connectWith: 	".layout-column",
            appendTo: 		"#grid-pages-panel",
            helper: 		"clone",
            items:			".layout-form-field",
            handle:			".drag-handle",
            cursor: 		"move",
            opacity: 		0.7,
            cursorAt: 		{left: 100, top: 15},
            start: function(e,ui){
                ui.helper.css({width: '200px', height: '35px', paddingTop: '20px'});
            },
            stop: function(e,ui){
                ui.item.removeAttr('style');
                buildLayoutString();
            }
        });

        // Draggables
        $( "h3 .layout-new-form-field" ).draggable({
            helper: "clone",
            appendTo: "body"
        });
        $('.page-toggle.button').droppable({
            accept: ".layout-form-field",
            over: function(e, ui){
                $(this).trigger('click');
                $( ".layout-column" ).sortable("refresh");
            }
        });



        buildLayoutString();
    };
    buildSortables();

    $('#grid-pages-panel').on('click','.column-fieldinsert .dashicons-plus-alt', function(e){
        //newfield-tool
        var target 		= $(this).closest('.column-container'),
            newfield 	= $('#newfield-tool').clone().css('display', '');

        insert_new_field(newfield, target);

    });

    $('#grid-pages-panel').on('click','.column-split', function(e){
        var column = $(this).parent().parent(),
            size = column.attr('class').split('-'),
            newcol = $('<div>').insertAfter(column);

        var left = Math.ceil(size[2]/2),
            right = Math.floor(size[2]/2);


        size[2] = left;
        column.attr('class', size.join('-'));
        size[2] = right;
        newcol.addClass(size.join('-')).append('<div class="layout-column column-container">');
        $(this).remove();
        buildSortables();

        jQuery('.column-tools').remove();
        jQuery('.column-merge').remove();

    });
    $( "#grid-pages-panel" ).on('click', '.column-remove', function(e){
        var row = $(this).closest('.row'),
            fields = row.find('.layout-form-field'),
            wrap = row.closest('.layout-grid-panel');

        //find fields
        if(fields.length){
            if(!confirm($('#row-remove-fields-message').text())){
                return;
            }
            fields.each(function(k,v){
                var field_id = $(v).data('config');
                $('#' + field_id ).remove();
                // remove options
                $('option[value="' + field_id + '"]').remove();
                $('[data-bind="' + field_id + '"]').remove();

                // remove field
                delete current_form_fields[field_id];

            });
        }

        row.slideUp(200, function(){
            $(this).remove();
            buildLayoutString();
            rebuild_field_binding();
            if(!wrap.find('.row').length){
                wrap.remove();
                var btn = $('#page-toggles .button-primary'),
                    prev = btn.prev(),
                    next = btn.next();

                btn.remove();
                if(prev.length){
                    prev.trigger('click');
                }else{
                    next.trigger('click');
                }
            }
            $(document).trigger('remove.page');
        });

        jQuery('.column-tools').remove();
        jQuery('.column-merge').remove();

    });

    $( ".caldera-config-editor-main-panel" ).on('click', '.caldera-add-row', function(e){
        e.preventDefault();
        var wrap = $('.page-active');
        if(!wrap.length){
            $('.caldera-add-page').trigger('click');
            return;
        }
        var new_row = $( '<div style="display:none;" class="first-row-level row"><div class="col-xs-12"><div class="layout-column column-container"></div></div></div>' );

        $('.page-active').append( new_row );
        new_row.slideDown( 200 );
        buildSortables();
        buildLayoutString();
    });

    $( "#grid-pages-panel" ).on('click', '.column-join', function(e){

        var column = $(this).parent().parent().parent();

        var	prev 		= column.prev(),
            left 		= prev.attr('class').split('-'),
            right 		= column.attr('class').split('-');
        left[2]		= parseFloat(left[2])+parseFloat(right[2]);


        column.find('.layout-column').contents().appendTo(prev.find('.layout-column'));
        prev.attr('class', left.join('-'));
        column.remove();
        buildLayoutString();
        jQuery('.column-tools').remove();
        jQuery('.column-merge').remove();
    });

    $('#grid-pages-panel').on('mouseenter','.row', function(e){
        var setrow = jQuery(this);
        jQuery('.column-tools,.column-merge').remove();
        setrow.children().children().first().append('<div class="column-remove column-tools"><i class="icon-remove"></i></div>');
        setrow.children().children().last().append('<div class="column-sort column-tools" style="text-align:right;"><i class="dashicons dashicons-menu drag-handle sort-handle"></i></div>');

        setrow.children().children().not(':first').prepend('<div class="column-merge"><div class="column-join column-tools"><i class="icon-join"></i></div></div>');
        var single = setrow.parent().parent().parent().width()/12-1;
        setrow.children().children().each(function(k,v){
            var column = $(v)
            var width = column.width()/2-5;
            column.prepend('<div class="column-fieldinsert column-tools"><i class="dashicons dashicons-plus-alt"></i></div>');
            if(!column.parent().hasClass('col-xs-1')){
                column.prepend('<div class="column-split column-tools"><i class="dashicons dashicons-leftright"></i></div>');
                column.find('.column-split').css('left', width);
            }
        });

        jQuery( ".column-merge" ).draggable({
            axis: "x",
            helper: "clone",
            appendTo: setrow,
            grid: [single, 0],
            drag: function(e, ui){
                $(this).addClass('dragging');
                $('.column-tools').remove();
                $('.column-split').remove();
                var column = $(this).parent().parent(),
                    dragged = ui.helper,
                    direction = (ui.originalPosition.left > dragged.position().left) ? 'left' : 'right',
                    step = 0,
                    prev = column.prev(),
                    single = Math.round(column.parent().width()/12-10),
                    distance = Math.abs(ui.originalPosition.left - dragged.position().left);

                column.parent().addClass('sizing');

                if(distance >= single){
                    var left 		= prev.attr('class').split('-'),
                        right 		= column.attr('class').split('-');

                    left[2]		= parseFloat(left[2]);
                    right[2]	= parseFloat(right[2]);

                    if(direction === 'left'){
                        left[2]--;
                        right[2]++;
                        if(left[2] > 0 && left[2] < (left[2]+right[2]) ){
                            prev.attr('class', left.join('-'));
                            column.attr('class', right.join('-'));
                            ui.originalPosition.left = dragged.position().left;
                        }else{
                            $(this).draggable( "option", "disabled", true );
                        }
                    }else{
                        left[2]++;
                        right[2]--;
                        if(right[2] > 0 && right[2] < (right[2]+right[2]) ){
                            prev.attr('class', left.join('-'));
                            column.attr('class', right.join('-'));
                            ui.originalPosition.left = dragged.position().left;
                        }else{
                            $(this).draggable( "option", "disabled", true );
                        }

                    }
                    buildLayoutString();
                }


            },
            stop: function(){
                $(this).removeClass('dragging').parent().parent().parent().removeClass('sizing');
            }
        });
    });
    $('#grid-pages-panel').on('mouseleave','.row', function(e){
        jQuery('.column-tools').remove();
        jQuery('.column-merge').remove();
    });

    $('#grid-pages-panel').on('click', '.layout-form-field .icon-remove', function(){
        var clicked = $(this),
            panel = clicked.parent(),
            config = $('#' + panel.data('config'));

        panel.slideUp(100, function(){
            $(this).remove();
        });
        config.slideUp(100, function(){
            $(this).remove();
        });
    });
    $( document ).on('click', '.layout-form-field .dashicons-admin-page', function(){
        var clicked = $( this ),
            wrap = clicked.parent(),
            clone_id = wrap.data('config'),
            clone = $('#' + clone_id ).formJSON(),
            target 		= clicked.closest('.column-container'),
            newfield 	= wrap.clone().css('display', ''),
            new_params = {};

        if( wrap.hasClass('field-edit-open') ){
            wrap.removeClass('field-edit-open');
            newfield.removeClass('field-edit-open');
            $('.caldera-editor-field-config-wrapper').hide();
        }

        if( clone.config.fields[ clone_id ] ){
            new_params = clone.config.fields[ clone_id ];
            delete new_params.ID;
        }

        insert_new_field(newfield, target, new_params);
    })

    $('body').on('click', '.layout-modal-edit-closer,.layout-modal-save-action', function(e){

        e.preventDefault();

        var clicked = $(this),
            panel = $('.layout-form-field.edit-open'),
            modal = clicked.closest('.layout-modal-container');
        settings = modal.find('.settings-panel').first();

        $('.edit-open').removeClass('edit-open');
        settings.appendTo(panel.find('.settings-wrapper')).hide();

        modal.hide();

    });

    // clear params
    $('.layout-editor-body').on('change', '.layout-core-pod-query', function(){
        $(this).parent().find('.settings-panel-row').remove();
        $('.edit-open').find('.drag-handle .set-pod').html(' - ' + $(this).val());
    });
    $('.layout-editor-body').on('click', '.remove-where', function(){
        $(this).closest('.settings-panel-row').remove();
    });
    // load pod fields
    $('.layout-editor-body').on('click', '.use-pod-container', function(){
        var clicked = $(this),
            podselect = clicked.prev(),
            pod	= podselect.val(),
            container = '';

        if(!pod.length){
            return;
        }

        $('.edit-open').find('.drag-handle .set-pod').html(' - ' + podselect.val());

        clicked.parent().parent().find('.spinner').css('display', 'inline-block');

        var data = {
            'action'	:	'pq_loadpod',
            'pod_reference'	:	{
                'pod'	:	pod
            }
        };

        $.post( cfAdminAJAX, data, function(res){

            clicked.parent().find('.spinner').css('display', 'none');

            var template = $('#where-line-tmpl').html(),
                fields = '',
                container = clicked.closest('.settings-panel').data('container');



            for(var i in res){
                fields += '<option value="' + res[i] + '">' + res[i] + '</option>';
            }
            template = template.replace(/{{fields}}/g, fields).replace(/{{container_id}}/g, container);

            clicked.parent().append( template );

        });

    });

    // edit row
    $('.caldera-editor-header').on('click', '.column-sort .icon-edit', function(e){

    });
    // bind tray stuff
    $('.layout-editor-body').on('tray_loaded', '.layout-template-tray', function(){
        buildSortables();
    });
    // build panel navigation
    $('.caldera-editor-header').on('click', '.caldera-editor-header-nav a', function(e){
        e.preventDefault();

        var clicked = $(this);

        // remove active tab
        $('.caldera-editor-header-nav li').removeClass('active');

        // hide all tabs
        $('.caldera-editor-body').hide();

        // show new tab
        $( clicked.attr('href') ).show();

        // set active tab
        clicked.parent().addClass('active');
        rebind_field_bindings();
    });

    $('body').on('change', '.required', function(){
        check_required_bindings(this);
    });

    // prevent error forms from submiting
    $('body').on('submit', '.caldera-forms-options-form', function(e){
        var errors = $('.required.has-error');
        if(errors.length){
            e.preventDefault();
        }
    });


    // presets
    $('.caldera-editor-body').on('change', '.preset_options', function(e){
        var select = $( this ),
            preset = select.val(),
            batch = $( select.data('bulk') );

        if( preset_options && preset_options[ preset ] && preset_options[ preset ].data ){
            if( typeof preset_options[ preset ].data === 'object' ){
                if( preset_options[ preset ].data.length ){
                    preset_options[ preset ].data = preset_options[ preset ].data.join("\n");
                }else{

                }
            }
            batch.val( preset_options[ preset ].data );
        }
    });

    $('.caldera-editor-body').on('click', '.page-toggle', function(e){
        var clicked = $(this),
            wrap = clicked.parent(),
            btns = wrap.find('.button');

        btns.removeClass('button-primary');
        $('.layout-grid-panel').hide().removeClass('page-active');
        $('#' + clicked.data('page')).show().addClass('page-active');
        clicked.addClass('button-primary');
        //reindex
        btns.each(function(k,v){
            $(v).html(wrap.data('title') + ' ' + (k+1) );
        });
        if(btns.length === 1){
            wrap.hide();
        }

    });

    $('.caldera-editor-body').on('blur toggle.values', '.toggle_label_field', function(e){

        var label = $(this),
            value = label.prev();

        if(value.val().length){
            return;
        }

        value.val(label.val());
    });


    $( document ).on('change focusout', '.toggle_value_field', function(){
        $( document ).trigger('show.fieldedit');
    });

    $( document ).on('show.fieldedit option.remove', function(e){
        $('.toggle_value_field.has-error').removeClass('has-error');
        var field = $( '#' + $('.layout-form-field.field-edit-open').data('config') ),
            options = field.find('.toggle_value_field'),
            notice = field.find('.notice'),
            count = 0;

        for( var i = 0; i < options.length; i++ ){
            var option = options[ i ].value,
                repeats = 0;
            for( var f = 0; f < options.length; f++ ){
                if( options[ i ] === options[ f ] ){ continue; }

                if( options[ i ].value === options[ f ].value ){
                    if ( options[ i ].value || options[ f ].value ) {
                        $(options[f]).addClass('has-error');
                        repeats++;
                    }
                }
            }
            if( repeats > 0 ){
                $( options[ i ] ).addClass('has-error');
                count++;
            }
        }

        if( count > 0 ){
            notice.slideDown();
            e.preventDefault();
        }else{
            notice.slideUp();
        }

    })
    var is_pulsating = false, pulsing_adders;

    focus_initial_field = function(e){
        var field = $('.layout-grid-panel .icon-edit').first();
        if( field.length ){
            field.trigger('click');
        }else{
            $('.layout-column.column-container').first().trigger('mouseover');
            is_pulsating = setInterval( pulsate_adders, 500 );
        }
        $( document ).off('load.page', focus_initial_field );
    };
    $( document ).on('load.page', focus_initial_field );
    function pulsate_adders(){

        if( is_pulsating ){
            var adders = $('.column-fieldinsert');
            if( adders.length ){
                adders.stop().fadeToggle(700);
                $('.layout-new-form-field').stop().fadeToggle(700);
            }else{
                cf_clear_puler();
            }
        }
    }

    cf_clear_puler = function(){
        if( is_pulsating ){
            clearTimeout( is_pulsating );
            $(document).off('mouseover', '.layout-new-form-field, .column-fieldinsert', cf_clear_puler);
        }
        $('.layout-new-form-field, .column-fieldinsert').fadeIn();
    };
    $(document).on('mouseover', '.layout-new-form-field, .column-fieldinsert', cf_clear_puler );
    // build fild bindings
    rebuild_field_binding();
    $(document).trigger('load.page');

    // build processor sortables
    function build_processor_sortables(){
        // set sortable groups
        $( ".caldera-editor-processors-panel ul" ).sortable({
            update: function(){
                rebuild_field_binding();
            }
        });

    }

    // set active processor editor
    $('body').on('click', '.caldera-processor-nav a', function(e){

        e.preventDefault();

        var clicked = $(this);

        $('.caldera-processor-nav').removeClass('active');
        $('.caldera-editor-processor-config-wrapper').hide();
        $( clicked.attr('href') ).show();
        clicked.parent().addClass('active');

    });

    $('body').on('click', '.add-new-processor', function(e){

        var clicked = $(this),
            new_conf_templ = Handlebars.compile( $('#processor-wrapper-tmpl').html() );
        wrap = $('.active-processors-list'),
            process_conf = $('.caldera-editor-processor-config'),
            processid = Math.round(Math.random() * 100000000);

        new_templ = Handlebars.compile( $('#processor-line-tmpl').html() );
        new_proc = {
            "id"	:	"fp_" + processid,
            "type"	:	clicked.data('type')
        };

        // place new group line
        wrap.append( new_templ( new_proc ) );

        // place config
        process_conf.append( new_conf_templ( new_proc ) );

        // reset sortable
        $('#form_processor_baldrickModalCloser').trigger('click');
        $('.caldera-processor-nav a').last().trigger('click');
        $('#fp_' + processid + '_type').val(clicked.data('type')).trigger('change');
        build_processor_sortables();

        baldrickTriggers();
    });

    // remove processor
    $('body').on('click', '.delete-processor', function(e){

        var clicked = $(this),
            parent = clicked.closest('.caldera-editor-processor-config-wrapper'),
            type = parent.data('type');

        if(!confirm(clicked.data('confirm'))){
            return;
        }

        $('.' + parent.prop('id')).remove();
        parent.remove();

        $('.caldera-processor-nav a').first().trigger('click');

        rebuild_field_binding();

    });

    // set title & config of selected processor
    $('body').on('change', '.caldera-select-processor-type', function(e){
        var selected = $(this),
            parent = selected.closest('.caldera-editor-processor-config-wrapper'),
            title = selected.find('option[value="'+selected.val()+'"]').text(),
            title_line = parent.find('.caldera-editor-processor-title'),
            activeline = $('.caldera-processor-nav.active a');

        if(title === ''){
            title = title_line.data('title');
        }

        title_line.html( title );
        activeline.html( title + ' <span class="processor-line-number"></span>' ).parent().addClass( 'processor_type_' + selected.val() );

        // get config
        build_processor_config(this);

        rebuild_field_binding();

    });
    $( document ).on('click', '#cf-shortcode-preview', function(){
        $(this).focus().select();
    } );
    $( document ).on('change', '.cf-email-preview-toggle', function(){
        var clicked = $(this),
            preview_button = $('.caldera-header-email-preview-button');
        if( clicked.is(':checked') ){
            preview_button.show().attr( 'aria-hidden', 'false' ).css( 'visibility', 'visible' );
        }else{
            preview_button.hide().attr( 'aria-hidden', 'true' ).css( 'visibility', 'hidden' );
        }

    } );


    // build processor type config
    function build_processor_config(el){

        var select 			= $(el),
            templ			= $('#' + select.val() + '-tmpl').length ? $('#' + select.val() + '-tmpl').html() : '',
            parent			= select.closest('.caldera-editor-processor-config-wrapper'),
            target			= parent.find('.caldera-config-processor-setup'),
            template 		= Handlebars.compile(templ),
            config			= parent.find('.processor_config_string').val(),
            current_type	= select.data('type');

        // Be sure to load the processors preset when switching back to the initial processor type.
        if(config.length && current_type === select.val() ){
            config = JSON.parse(config);
        }else{
            // default config
            config = processor_defaults[select.val() + '_cfg'];
        }

        // build template
        if(!config){
            config = {};
        }

        config._id = parent.prop('id');
        config._name = 'config[processors][' + parent.prop('id') + '][config]';




        template = $('<div>').html( template( config ) );

        // send to target
        target.html( template.html() );

        // check for init function
        if( typeof window[select.val() + '_init'] === 'function' ){
            window[select.val() + '_init'](parent.prop('id'), target);
        }

        // check if conditions are allowed
        if(parent.find('.no-conditions').length){
            // conditions are not supported - remove them
            parent.find('.toggle_option_tab').remove();
        }


        rebuild_field_binding();
        baldrickTriggers();

        // initialise baldrick triggers
        $('.wp-baldrick').baldrick({
            request     : cfAdminAJAX,
            method      : 'POST',
            before		: function(el){

                var tr = $(el);

                if( tr.data('addNode') && !tr.data('request') ){
                    tr.data('request', 'cf_get_default_setting');
                }
            }
        });

    }

    // build configs on load:
    // allows us to keep changes on reload as not to loose settings on accedental navigation
    rebuild_field_binding();

    $('.caldera-select-processor-type').each(function(k,v){
        build_processor_config(v);
    });


    build_processor_sortables();
});//


// field binding helper
Handlebars.registerHelper('_field', function(args) {

    var config = this,required="", is_array = "", exclude="";

    var default_val = this[args.hash.slug] ? ' data-default="' + this[args.hash.slug] + '"' : '';

    if(args.hash.required){
        required = " required";
    }
    if(args.hash.exclude){
        exclude = 'data-exclude="'+args.hash.exclude+'"';
    }
    if(args.hash.array){
        is_array = "[]";
        if(args.hash.array !== 'true'){
            default_val = 'value="' + args.hash.array + '"';
        }
    }

    out = '<select ' + ( args.hash.type ? 'data-type="' + args.hash.type + '"' : '' ) + default_val +' ' + exclude + ' name="' + this._name + '[' + args.hash.slug + ']' + is_array + '" id="' + this._id + '_' + args.hash.slug + '" class="block-input field-config caldera-field-bind' + required + '">';
    if(this[args.hash.slug]){
        out += '<option class="bound-field" value="' + this[args.hash.slug] + '" class="bound-field"></option>';
    }else{
        if(!args.hash.required){
            out += '<option value=""></option>';
        }
    }
    for(var fid in current_form_fields){

        var sel = '';

        if(args.hash.type){
            if(current_form_fields[fid].type !== args.hash.type){
                continue;
            }
        }

        if(config[args.hash.slug]){
            if(config[args.hash.slug] === fid){
                sel = ' selected="selected"';
            }
        }


        out += '<option value="' + fid + '"' + sel + '>' + current_form_fields[fid].label + ' [' + current_form_fields[fid].slug + ']</option>';
    };

    out += '</select>';
    if(args.hash.required){
        out += '<input class="field-config" name="' + this._name + '[_required_bounds][]" type="hidden" value="' + args.hash.slug + '">';
    }
    return out;
});

Handlebars.registerHelper('console', function(context, options) {
    console.log(this);
});



jQuery.fn.scrollEnd = function(callback, timeout) {
	jQuery(this).scroll(function(){
		var jQuerythis = jQuery(this);
		if (jQuerythis.data('scrollTimeout')) {
			clearTimeout(jQuerythis.data('scrollTimeout'));
		}
		jQuerythis.data('scrollTimeout', setTimeout(callback,timeout));
	});
};