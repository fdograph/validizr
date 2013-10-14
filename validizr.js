(function( window, $, undefined ){
    "use strict";
    window.Validizr = function( formulario, options ){
        this.defaults = {
            delegateFields_change : true, // bool, controla la delegacion de la validacion en los campos
            delegateFields_keyup : true, // bool, controla la delegacion de la validacion en los campos
            delegateFields_custom : undefined, // string, controla la delegacion de la validacion en los campos
            delegateBtn : true, // bool, controla la delegacion de la validacion en el submitBtn
            submitBtn : undefined, // jQuery object, $('#ejemplo')
            disableBtn : true, // bool, controla si se le pone o no la prop disabled al submitBtn
            validFormCallback : undefined, // funcion, lleva como parametro el $formulario
            notValidFormCallBack : undefined, // funcion, lleva como parametro el $formulario
            validInputCallback : undefined, // funcion, lleva como parametro el $input
            notValidInputCallback : undefined, // funcion, lleva como parametro el $input
            preValidation : undefined, // funcion, lleva como parametro el $formulario y el $input
            postValidation : undefined, // funcion, lleva como parametro el $formulario y el $input
            notValidClass : 'invalid-input', // string, clase a aplicar a los inputs no validos
            aditionalInputs : undefined, // string, selector para inputs customizados
            customValidations : {}, // objeto, prototipo para las validaciones customizadas. 
            customErrorHandlers : {} // objeto, prototipo para los errores customizados. 
        };
        this.settings = $.extend(true, {}, this.defaults, options);
        this.emailRegEx = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
        this.fields = 'input:not([type="submit"]), select, textarea' + ( this.settings.aditionalInputs ? ', ' + this.settings.aditionalInputs : '' );
        this.$form = $( formulario );
        this.$submitBtn = this.settings.submitBtn ? this.settings.submitBtn : this.$form.find('input[type="submit"]');
        
        var events = 'validateInput.validizr ';
        
        if( this.settings.delegateFields_change ){ events += 'change.validizr '; }
        if( this.settings.delegateFields_keyup ){ events += 'keyup.validizr '; }
        if( this.settings.delegateFields_custom ){ events += this.settings.delegateFields_custom; }
        
        // se empieza a delegar, depende de los settings
        if( this.settings.delegateFields_change || this.settings.delegateFields_keyup || this.settings.delegateFields_custom ){ this.$form.on(events, this.fields, {validizr : this}, this.validateInput ); }
        // if( this.settings.delegateBtn ){ this.$submitBtn.on('click.validizr', {validizr : this}, this.validateForm ); }
        if( this.settings.disableBtn ){ this.$submitBtn.addClass('disabled').prop('disabled', true); }

        this.$form.on('submit.validizr', {validizr : this}, this.validateForm);
        this.$form.attr({ 'data-validizr-handled' : 'true', 'novalidate' : true });
    };
    window.Validizr.prototype = {
        validateInput : function( event ){
            var validizr = event.data.validizr,
                $input = $(this),
                inputType = validizr.getInputType($input),
                value = $input.val(),
                customHandler = $input.data('custom-validation'),
                isValidInput = (function(){
                    // si hay validacion customizada, se devuelve el resultado de esta
                    if( typeof( validizr.settings.customValidations[ customHandler ] ) === 'function' ){ return validizr.settings.customValidations[ customHandler ]( $input ); }
                    
                    // se valida genericamente
                    switch( inputType ){
                        case 'email' :
                            return value && validizr.emailRegEx.test( value );
                            break;
                        case 'checkbox' :
                            return $input.prop('checked');
                            break;
                        default :
                            return value;
                            break;
                    }
                }());
            if( $input.hasClass( validizr.settings.notValidClass ) ){ $input.removeClass( validizr.settings.notValidClass ); }
            
            if( typeof(validizr.settings.preValidation) === 'function' ){ validizr.settings.preValidation( validizr.$form, $input ); }
            
            if( ( $input.is('[required]') || $input.hasClass('required') ) && ! isValidInput ){ 
                $input.data('input_validity', false);
                validizr.youAreNotValid( $input, validizr ); 
            }
            else {
                $input.data('input_validity', true);
            }
            
            if( typeof(validizr.settings.postValidation) === 'function' ){ validizr.settings.postValidation( validizr.$form, $input ); }
                        
            if( validizr.isFormValid( validizr ) && validizr.settings.disableBtn ){ validizr.$submitBtn.removeClass('disabled').prop('disabled', false); }
            else if( validizr.settings.disableBtn ) { validizr.$submitBtn.addClass('disabled').prop('disabled', true); }
        },
        validateForm : function( event ){
            // event.preventDefault();
            var validizr = event.data.validizr;

            validizr.$form.find( validizr.fields ).trigger('validateInput.validizr');

            if( validizr.isFormValid() ){ 
                if( typeof( validizr.settings.validFormCallback ) === 'function' ) {
                    return validizr.settings.validFormCallback( validizr.$form );
                }
                return true;
            }
            else if( typeof( validizr.settings.notValidFormCallBack ) === 'function' ) {
                validizr.settings.notValidFormCallBack( validizr.$form );
                return false;
            }
            
            return false;
        },
        isFormValid : function(){
            var validizr = this,
                $fieldsGroup = validizr.$form.find( validizr.fields ),
                totalLength = $fieldsGroup.length,
                validLength = $fieldsGroup.filter(function(){ return $(this).data('input_validity'); }).length,
                softValidation = validizr.$form.find('.' + validizr.settings.notValidClass).length;
        
            return totalLength === validLength && !softValidation;
        },
        youAreNotValid : function( $input, validizr ){
            var customHandler = $input.data('custom-error-validation');
            
            $input.addClass( validizr.settings.notValidClass );
            if( typeof( validizr.settings.customErrorHandlers[ customHandler ] ) === 'function' ) { return validizr.settings.customErrorHandlers[ customHandler ]( $input ); }
            if( typeof( validizr.settings.notValidInputCallback ) === 'function' ) { return validizr.settings.notValidInputCallback( $input ); }
        },
        getInputType : function( $input ){ return $input.attr('type') ? $input.attr('type') : $input.get(0).tagName.toLowerCase(); },
        removeSubmitListener : function(){
            this.$form.off('submit.validizr');
        }
    };
    
    $.fn.validizr = function( options ) {
        return this.each(function(){
            var $element = $(this);
            if ( $element.data('validizr') ) { return $element.data('validizr'); }
            var validizr = new window.Validizr( this, options );
            $element.data('validizr', validizr);
        });
    };
}( this, jQuery ));