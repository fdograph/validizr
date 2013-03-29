(function( window, $, undefined ){
    window.Validizr = function( formulario, options ){
        this.defaults = {
            delegateFields : true, // bool, controla la delegacion de la validacion en los campos
            delegateBtn : true, // bool, controla la delegacion de la validacion en el submitBtn
            submitBtn : undefined, // jQuery object, $('#ejemplo')
            validFormCallback : undefined, // funcion, lleva como parametro el $formulario
            notValidInputCallback : undefined, // funcion, lleva como parametro el $input
            notValidClass : 'invalid-input', // string, clase a aplicar a los inputs no validos
            aditionalInputs : undefined, // jQuery Object, coleccion de campos no estandar para agregar a la validacion, por ejemplo, un fake select. Usa $.add()
            customValidations : {} // objeto, prototipo para las validaciones customizadas. 
        };
        this.$form = $( formulario );
        this.settings = $.extend(true, {}, this.defaults, options);
        this.emailRegEx = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
        this.$submitBtn = this.settings.submitBtn ? this.settings.submitBtn : this.$form.find('input[type="submit"]');
        this.$fields = this.$form.find('input:not([type="submit"]), select, textarea');
        if( this.settings.aditionalInputs ){ this.$fields = this.$fields.add( this.settings.aditionalInputs ); }
        
        // se empieza a delegar, depende de los settings
        if( this.settings.delegateFields ){ this.$fields.on('change.validizr keyup.validizr', $.proxy( this.validateInput, this ) ); }
        if( this.settings.delegateBtn ){ this.$submitBtn.on('click.validizr', $.proxy( this.validateForm, this ) ); }
    };
    window.Validizr.prototype = {
        validateInput : function( event ){
            var $input = $(event.currentTarget),
                inputType = this.getInputType($input),
                value = $input.val(),
                customHandler = $input.data('custom-validation'),
                genericValidity = inputType === 'email' ? value && this.emailRegEx.test( value ) : value,
                isValidInput = customHandler && typeof( this.settings.customValidations[ customHandler ] ) === 'function' ? this.settings.customValidations[ customHandler ]( $input ) : genericValidity;
            if( $input.hasClass( this.settings.notValidClass ) ){ $input.removeClass( this.settings.notValidClass ); }
            if( ( $input.is('[required]') || $input.hasClass('required') ) && ! isValidInput ){ this.youAreNotValid( $input ); }    
                        
            if( this.isFormValid() ){ this.$submitBtn.removeClass('disabled').prop('disabled', false); }
            else { this.$submitBtn.addClass('disabled').prop('disabled', true); }
        },
        validateForm : function( event ){
            event.preventDefault();
            this.$fields.trigger('change.validizr');
            if( this.isFormValid() ){ 
                if( typeof( this.settings.validFormCallback ) === 'function' ) { return this.settings.validFormCallback( this.$form ); }
                return this.$form.submit();
            }
        },
        isFormValid : function(){ return ! this.$form.find('.' + this.settings.notValidClass).length; }, // Inseguro, hay que mejorarlo.
        youAreNotValid : function( $input ){
            $input.addClass( this.settings.notValidClass ); 
            if( typeof( this.settings.notValidInputCallback ) === 'function' ) { return this.settings.notValidInputCallback( $input ); }
        },
        getInputType : function( $input ){ return $input.attr('type') ? $input.attr('type') : $input.get(0).tagName.toLowerCase(); }
    };
    
    $.fn.validizr = function( options ) {
        return this.each(function(){
            var $element = $(this);
            if ( $element.data('validizr') ) { return $element.data('validizr'); }
            var validizr = new window.Validizr( this, options );
            $element.data('validizr', validizr);
        });
    };
    
    // uso
    $(window.document).ready(function(){ 
        $('#login-form').validizr({
            delegateFields : true, // bool, controla la delegacion de la validacion en los campos
            delegateBtn : true, // bool, controla la delegacion de la validacion en el submitBtn
            submitBtn : undefined, // jQuery object, $('#ejemplo')
            validFormCallback : undefined, // funcion, lleva como parametro el $formulario
            notValidInputCallback : undefined, // funcion, lleva como parametro el $input
            notValidClass : 'invalid-input', // string, clase a aplicar a los inputs no validos
            aditionalInputs : undefined, // jQuery Object, coleccion de campos no estandar para agregar a la validacion, por ejemplo, un fake select. Usa $.add()
            customValidations : {} // objeto, prototipo para las validaciones customizadas. 
        }); 
    });
}( this, jQuery ));