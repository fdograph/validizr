/**
 * Motor de validacion de formularios para jQuery.
 * Cuenta con objetos extensibles con el fin de ofrecer la major flexibilidad al hacer validaciones
 * @author  Fernando Silva
 * @link    https://github.com/fdograph/validizr
 */
(function(window, $){
    "use strict";

    window.Validizr = function(form, options){
        if( !form ){ return; }

        var self = this;

        self.defaults = {
            validatedInit : false, 
            delegate_change : true, // bool, controla la delegacion de la validacion en los campos
            delegate_keyup : true, // bool, controla la delegacion de la validacion en los campos
            delegate_custom : undefined, // string, controla la delegacion de la validacion en los campos

            submitBtn : undefined,
            disableBtn : false, // bool, controla si se le pone o no la prop disabled al submitBtn

            onInit : undefined,

            validFormCallback : undefined, // funcion, lleva como parametro el $formulario
            notValidFormCallBack : undefined, // funcion, lleva como parametro el $formulario

            validInputCallback : undefined, // funcion, lleva como parametro el $input
            notValidInputCallback : undefined, // funcion, lleva como parametro el $input

            preValidation : undefined, // funcion, lleva como parametro el $formulario y el $input
            postValidation : undefined, // funcion, lleva como parametro el $formulario y el $input

            notValidClass : 'invalid-input', // string, clase a aplicar a los inputs no validos
            validClass : 'valid-input', // string, clase a aplicar a los inputs no validos

            aditionalInputs : undefined, // string, selector para inputs customizados
            customValidations : {}, // objeto, prototipo para las validaciones customizadas. 

            customValidHandlers : {}, // objeto, prototipo para los exitos customizados. 
            customErrorHandlers : {}, // objeto, prototipo para los errores customizados. 

            customUrlRegexp : undefined,
            customEmailRegexp : undefined
        };
        self.settings = $.extend(true, {}, self.defaults, (options || {}));

        self.$form = $(form);
        self.fieldsSelector = 'input:not([type="submit"]), select, textarea' + ( self.settings.aditionalInputs ? ', ' + self.settings.aditionalInputs : '' );
        self.$submitBtn = typeof( self.settings.submitBtn ) === 'undefined' ? self.$form.find('[type="submit"]') : $( self.settins.submitBtn );
        self.emailRegEx = new RegExp("[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?");
        self.urlRegEx = new RegExp("[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?", 'gi');

        var events = 'validate.validizr';

        if( self.settings.delegate_change ){ events += ' change.validizr'; }
        if( self.settings.delegate_keyup ){ events += ' keyup.validizr'; }
        if( self.settings.delegate_custom ){ events += ' ' + self.settings.delegate_custom; }

        if( self.settings.disableBtn ){ self.$submitBtn.addClass('disabled').prop('disabled', true); }

        self.$form
            .attr({ 'data-validizr-handled' : 'true', 'novalidate' : true })
            .on('submit.validizr', { validizr : self }, self.validateForm)
            .on( events, self.fieldsSelector, { validizr : self }, self.validateInputs);

        if( typeof( self.settings.onInit ) === 'function' ){ self.settings.onInit( self.$form, validizr ); }

        if( self.settings.validatedInit ){ validizr.$form.find( validizr.fieldsSelector ).trigger('validate.validizr'); }
    };
    window.Validizr.prototype = {
        validateInputs : function( event ){
            var validizr = event.data.validizr,
                $input = $(event.currentTarget),
                inputType = validizr.getInputType($input),
                value = $input.val(),
                customHandler = $input.data('custom-validation'),
                validInput = (function(){
                    if( ! $input.is('[required]') && ! $input.hasClass('required') ){ return true; }
                    if( !!customHandler && typeof( validizr.settings.customValidation[ customHandler ] ) === 'function' ){
                        return validizr.settings.customValidation[ customHandler ]( $input );
                    }
                    switch( inputType ){
                        case 'email' :
                            return !!value && validizr.emailRegEx.test(value);

                        // case 'url' : return !!value && validizr.urlRegEx.test(value); //desactivado hasta que funcione bien
                        
                        case 'checkbox' : 
                            return $input.prop('checked');
                        default : 
                            return !!value;
                    }
                }());

            $input.removeClass( validizr.settings.notValidClass + ' ' + validizr.settings.validClass ); 


            if( typeof(validizr.settings.preValidation) === 'function' ){ 
                validizr.settings.preValidation( validizr.$form, $input );
            }
            
            validizr.youAre( validInput, $input );

            if( typeof(validizr.settings.postValidation) === 'function' ){
                validizr.settings.postValidation( validizr.$form, $input );
            }
            
            if( validizr.settings.disableBtn ){
                validizr.$submitBtn.removeClass('disabled').prop('disabled', !validizr.isFormValid( validizr ));
            }
        },
        validateForm : function( event ){
            var validizr = event.data.validizr,
                validFlag = false;

            validizr.$form.find( validizr.fieldsSelector ).trigger('validate.validizr');

            validFlag = validizr.isFormValid();

            if( validFlag ){
                if( typeof( validizr.settings.validFormCallback ) === 'function' && !validizr.$form.data('trigger-submit') ) {
                    validizr.settings.validFormCallback( validizr.$form );
                    event.preventDefault();
                    return false;
                }
                return true;
            }
            else if( typeof( validizr.settings.notValidFormCallBack ) === 'function' ) {
                validizr.settings.notValidFormCallBack( validizr.$form );
            }

            event.preventDefault();
            return false;
        },
        isFormValid : function(){
            var validizr = this,
                $fieldsGroup = validizr.$form.find( validizr.fieldsSelector ),
                totalLength = $fieldsGroup.length,
                validLength = $fieldsGroup.filter(function(){ return $(this).data('input_validity'); }).length,
                softValidation = validizr.$form.find('.' + validizr.settings.notValidClass).length;
        
            return totalLength === validLength && !softValidation;
        },
        youAre : function(validity, $input){
            var validizr = this,
                customHandler_invalid = $input.data('custom-invalid-callback'),
                customHandler_valid = $input.data('custom-valid-callback'),
                hasGenericValidation_valid = typeof( validizr.settings.validInputCallback ) === 'function',
                hasCustomValidation_valid = typeof( validizr.settings.customValidHandlers[ customHandler_valid ] ) === 'function',
                hasGenericValidation_invalid = typeof( validizr.settings.notValidInputCallback ) === 'function',
                hasCustomValidation_invalid = typeof( validizr.settings.customErrorHandlers[ customHandler_invalid ] ) === 'function';
            
            $input.data('input_validity', validity);
            $input.attr('data-input-validity', validity);

            if( validity ){
                $input.addClass( validizr.settings.validClass );
                if( hasCustomValidation_valid ){
                    validizr.settings.customValidHandlers[ customHandler_valid ]( $input );
                    return;
                }

                if( hasGenericValidation_valid ){
                    validizr.settings.validInputCallback( $input );
                    return;
                }
            } else {
                $input.addClass( validizr.settings.notValidClass );
                if( hasCustomValidation_invalid ){
                    validizr.settings.customErrorHandlers[ customHandler_invalid ]( $input );
                    return;
                }
                if( hasGenericValidation_invalid ){
                    validizr.settings.notValidInputCallback( $input );
                    return;
                }
            }
        },
        getInputType : function( $input ){
            return $input.attr('type') ? $input.attr('type') : $input.get(0).tagName.toLowerCase();
        }
    };

    $.fn.validizr = function(options){ return this.each(function(){ $(this).data('validizr', (new window.Validizr(this, options))); }); };

}(this, jQuery));