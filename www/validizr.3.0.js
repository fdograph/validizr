(function(window, document){
    "use strict";

    // merges objects and overrides properties of the target object
    var extend = function(target, source) {
        var a = Object.create(target);
        Object.keys(source).map(function (prop) {
            prop in a && (a[prop] = source[prop]);
        });
        return a;
    };

    // test if a given element matches a css selector
    var matchesSelector = function(selector, element) {
        var matches = (element.document || element.ownerDocument).querySelectorAll(selector);
        var i = 0;

        while (matches[i] && matches[i] !== element) {
            i++;
        }

        return matches[i] ? true : false;
    };

    // vanilla similar of jQuery.on()
    // multiple arguments model
    // v1 : events (String), element (node), callback (function) ---- directly delegates callback
    // v2 : events (String), element (node), data (object), callback (function) ---- directly delegates callback
    // v3 : events (String), element (node), selector (string), data (object), callback (function) ---- delegates event to one parent
    var on = function(){
        if( !arguments || !arguments.length ){ return; } 
        
        var events = arguments[0],
            element = arguments[1],
            data = {},
            childrenSelectors, callback;

        if( typeof arguments[2] === 'object' ){
            data = arguments[2];
            callback = arguments[3];
        }
        else if( typeof arguments[2] === 'function' ){
            callback = arguments[2];
        }
        else if( typeof arguments[2] === 'string' ){
            childrenSelectors = arguments[2];

            if( typeof arguments[3] === 'object' ){
                data = arguments[3];
                callback = arguments[4];
            }
            else if( typeof arguments[3] === 'function' ){
                callback = arguments[3];
            }  
        }

        events.split(' ').forEach(function( ev ){
            element.addEventListener( ev, function( event ){
                event.data = data;
                
                if( childrenSelectors && event.target && matchesSelector( childrenSelectors, event.target ) ){
                    callback.bind( event.target )( event );
                } else {
                    callback.bind(element)( event );
                }
            }, false);
        });
    };

    var toRealArray = function( arrayLike ){
        return arrayLike ? Array.prototype.map.call(arrayLike, function(v){ return v; }) : [];
    };

    window.Validizr = function( form, options ){
        if( !form ){ return; } // safety first

        // create the defaults and allow for custom options
        this.defaults = {
            validateOnInit : false, // bool, activa/desactiva la validacion en la inicializacion
            delegate_change : true, // bool, controla la delegacion de la validacion en los campos
            delegate_keyup : true, // bool, controla la delegacion de la validacion en los campos

            onInit : undefined, // callback para despues de la inicialiacion del plugin

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
            customErrorHandlers : {} // objeto, prototipo para los errores customizados. 
        };
        this.settings = extend( this.defaults, (options || {}) );

        // identify the form element
        if( typeof form === 'string' ){
            this.form = document.querySelector( form );
        }
        else if( form.nodeType ){
            this.form = form;
        }

        this.emailRegEx = new RegExp("[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?");
        // this.urlRegEx = new RegExp("^((http|https):\/\/(\w+:{0,1}\w*@)?(\S+)|)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$");

        // cache selectors
        this.inputs_selector = 'input:not([type="submit"]):not([type="reset"]), select, textarea';
        if( this.settings.aditionalInputs ) {
            this.inputs_selector += ' ' + this.settings.aditionalInputs;
        }

        // disable html5 validation
        this.form.noValidate = true;
        this.form.dataset.validizrHandled = true;

        // delegate events
        var events = 'validizrValidate';
        if( this.settings.delegate_change ){ events += ' change'; }
        if( this.settings.delegate_keyup ){ events += ' keyup'; }

        on( events, this.form, this.inputs_selector, { validizr : this }, this.validateInputs );
        on( 'submit', this.form, { validizr : this }, this.validateForm );

        // trigger validation on init if set
        if( this.settings.validateOnInit ){
            this.validate();
        }

        // fire init callback if exist
        if( typeof( this.settings.onInit ) === 'function' ){ 
            this.settings.onInit( this.form, this ); 
        }

        // return plain object with useful functions
        return {
            validate : this.validate.bind(this),
            getStatus : this.getStatus.bind(this)
        };
    };
    window.Validizr.prototype = {
        validateInputs : function( event ){
            var input = this,
                validizr = event.data.validizr,
                inputType = validizr.getInputType( input ),
                customHandler = input.getAttribute('data-custom-validation'),
                value = input.value,
                validInput = (function(){
                    var isRequired = input.required || typeof input.getAttribute('required') !== 'undefined';
                    if( !isRequired && !input.classList.contains('required') ){ return true; }
                    if( !!customHandler && typeof validizr.settings.customValidations[ customHandler ] === 'function' ){
                        return validizr.settings.customValidations[ customHandler ]( input );
                    }
                    switch( inputType ){
                        case 'email' : return !!value && validizr.emailRegEx.test( value );
                        // case 'url' : return !!value && validizr.urlRegEx.test( value );
                        case 'checkbox' : return input.checked;
                        default : return !!value;
                    }
                }());

            console.log(validInput);

            if( input.classList.contains( validizr.settings.notValidClass ) || input.classList.contains( validizr.settings.validClass ) ){ 
                input.classList.remove( validizr.settings.notValidClass ); 
                input.classList.remove( validizr.settings.validClass ); 
            }

            if( typeof(validizr.settings.preValidation) === 'function' ){ validizr.settings.preValidation( validizr.form, input ); }

            validizr.youAre( validInput, input );

            if( typeof(validizr.settings.postValidation) === 'function' ){ validizr.settings.postValidation( validizr.form, input ); }
        },
        validateForm : function( event ){
            var validizr = event.data.validizr,
                isValid = false;

            validizr.validate();
            isValid = validizr.isFormValid();

            if( isValid ){
                if( typeof( validizr.settings.validFormCallback ) === 'function' ) {
                    event.preventDefault();
                    validizr.settings.validFormCallback( validizr.form );
                    if( validizr.form.dataset.nativeSubmit ){
                        return true;
                    }
                    return false;
                }
                return true;
            }
            else if( typeof( validizr.settings.notValidFormCallBack ) === 'function' ) {
                validizr.settings.notValidFormCallBack( validizr.form );
            }

            event.preventDefault();
            return false;
        },
        isFormValid : function(){
            var fields = toRealArray( this.form.querySelectorAll( this.inputs_selector ) ),
                totalLength = fields.length,
                validLength = fields.filter(function( input ){ return input.dataset.validizrValidity; }).length,
                softValidation = toRealArray( this.form.querySelectorAll( '.' + this.settings.notValidClass ) ).length;
            return totalLength === validLength && !softValidation;
        },
        youAre : function( validity, input ){
            var customHandler_invalid = input.getAttribute('data-custom-invalid-callback'),
                customHandler_valid = input.getAttribute('data-custom-valid-callback');
            
            input.dataset.validizrValidity = validity;

            if( validity ){
                input.classList.add( this.settings.validClass );

                if( typeof( this.settings.customValidHandlers[ customHandler_valid ] ) === 'function' ) { 
                    this.settings.customValidHandlers[ customHandler_valid ]( input ); 
                }
                if( typeof( this.settings.validInputCallback ) === 'function' ) { 
                    this.settings.validInputCallback( input ); 
                }
            } else {
                input.classList.add( this.settings.notValidClass );

                if( typeof( this.settings.customErrorHandlers[ customHandler_invalid ] ) === 'function' ) { 
                    this.settings.customErrorHandlers[ customHandler_invalid ]( input ); 
                }
                if( typeof( this.settings.notValidInputCallback ) === 'function' ) { 
                    this.settings.notValidInputCallback( input ); 
                }
            }
        },
        getInputType : function( input ){
            return input.type ? input.type.toLowerCase() : input.tagName.toLowerCase();
        },
        validate : function( selector ){
            var inputs = toRealArray( this.form.querySelectorAll( selector || this.inputs_selector ) );
            inputs.forEach(function( input ){
                // var validation_event = new Event('validizrValidate', { 'bubbles': true, 'cancelable': true });
                var validation_event = document.createEvent("Event");
                validation_event.initEvent("validizrValidate", true, true);
                input.dispatchEvent( validation_event );
            });
        },
        getStatus : function(){
            var fields = toRealArray( this.form.querySelectorAll( this.inputs_selector ) );
            return {
                validity : this.isFormValid(),
                invalidInputs : fields.filter(function( input ){ return !input.dataset.validizrValidity; }),
                validInputs : fields.filter(function( input ){ return input.dataset.validizrValidity; })
            };
        }
    };

}(this, this.document));