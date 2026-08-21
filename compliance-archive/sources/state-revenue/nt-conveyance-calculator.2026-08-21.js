function createCalculator(el, c)
{
    switch(c)
    {
        case 'SDC':
            // Stamp Duty Conveyances Calculator
            createSDC(el);
        break;

        case 'PPRR':
            createPPRR(el);
        break;

        case 'FHOC':
            createFHOC(el);
            break;

        case 'FHOD':
            createFHOD(el);
            break;

        case 'FHOCHS':
            createFHOCHS(el);
        break;

        case 'SPCC':
            createSPCC(el);
        break;

        case 'MVR':
            createMVR(el);
        break;

        case 'SSC':
            createSSC(el);
        break;

        case 'DIC':
            createDISCDisclaimer(el);
        break;
    }

    el.find('.datepicker').datepicker({
        dateFormat: 'dd/mm/yy'
    });

    //removeLoadingAnimation();
    //el.slideDown('slow');
}

// Code to convert Aus Date to US Format

function auDate(date)
{
    console.log(date);
    var initial = date.split(/\//);
    return new Date([ initial[1], initial[0], initial[2] ].join('/'));
}


/*
    Code for individual calculators
*/

function createSDC(el)
{
    // var html =
    //     '<table cellpadding="0" cellspacing="0">' +
    //         '<tr>' +
    //             '<td class="first-td">Value of property: <span class="table-cur-right">$</span></td>' +
    //             '<td><input autocomplete="off" type="text" id="calc-value" class="numbers" maxlength="15"/></td>' +
    //         '</tr>' +
    //         '<tr>' +
    //             '<td>Date of contract (dd/mm/yyyy):</td>' +
    //             '<td><input autocomplete="off" type="text" id="calc-date-1" class="datepicker" maxlength="10" /></td>' +
    //         '</tr>' +
    //         '<tr>' +
    //             '<td>Estimated stamp duty: <span class="table-cur-right">$</span></td>' +
    //             '<td><input type="text" id="calc-result" disabled="true" /></td>' +
    //         '</tr>' +
    //         '<tr>' +
    //             '<td> </td>' +
    //             '<td><input type="submit" id="calc-calculate" value="Calculate" /> <input type="submit" id="calc-reset" value="Reset" /></td>' +
    //         '</tr>' +
    //     '</table>';

    // el.html(html);

    $(el).on('blur', 'input[type=text]', function(){
        console.log( $(this).val() );
        console.log( this.value );
        //hideError();
        validateInputValue( this, true, $(this).attr('class'));
    });

    $(el).on('click', '#calc-calculate', function(e) {
        
        hideError();

        $('#calc-result').val("");

        e.stopPropagation();
        e.preventDefault();

        // check form values that they are numeric/date/etc based on their class names
        if(validateFormValues( $(el) ) )
        {
         console.log('Running Conversion');
            sdCONV();
        } else {
            console.log('Unable to validate form');
        }

        return false;
    });

    $('#calc-reset').on('click', function() {
        $('#calc-value, #calc-date-1, #calc-result').val('');
        $(document.getElementById('calc-value')).focus();
        return false;
    });
}

function createPPRR(el)
{
    var html =
        '<table cellpadding="0" cellspacing="0">' +
            '<tr>' +
                '<td class="first-td">Value of property: <span class="table-cur-right">$</span></td>' +
                '<td><input autocomplete="off" type="text" id="calc-value" class="numbers" maxlength="15" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td>Date of contract (dd/mm/yyyy):</td>' +
                '<td><input autocomplete="off" type="text" id="calc-date-1" class="datepicker" maxlength="10" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td>Estimated stamp duty: <span class="table-cur-right">$</span></td>' +
                '<td><input type="text" id="calc-result" disabled="true" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td> </td>' +
                '<td><input type="submit" id="calc-calculate" value="Calculate" /> <input type="submit" id="calc-reset" value="Reset" /></td>' +
            '</tr>' +
        '</table>';

    el.html(html);

    el.find('input:text').blur(function(){
        hideError();
        validateInputValue(this, true, $(this).attr('class'))
    });

    $('#calc-calculate').click(function(e) {
        hideError();

        document.getElementById('calc-result').value = "";

        e.stopPropagation();
        e.preventDefault();

        // check form values that they are numeric/date/etc based on their class names
        if(validateFormValues(el))
        {
            sdPPRR();
        }

        return false;
    });

    $('#calc-reset').click(function() {
        $('#calc-value, #calc-date-1, #calc-result').val('');
        $(_e('calc-value')).focus();
        return false;
    });
}

function createFHOD(el) {
    var html =
        '<table cellpadding="0" cellspacing="0">' +
            '<tr>' +
                '<td class="first-td">Established home:</td>' +
                '<td><select id="calc-established"><option value="Yes">Yes</option><option value="No">No</option></select></td>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td">Value of property: <span class="table-cur-right">$</span></td>' +
                '<td><input autocomplete="off" type="text" id="calc-value" class="numbers" maxlength="15" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td>Date of contract (dd/mm/yyyy):</td>' +
                '<td><input autocomplete="off" type="text" id="calc-date-1" class="datepicker" maxlength="10" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td>Estimated stamp duty: <span class="table-cur-right">$</span></td>' +
                '<td><input type="text" id="calc-result" disabled="true" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td> </td>' +
                '<td><input type="submit" id="calc-calculate" value="Calculate" /> <input type="submit" id="calc-reset" value="Reset" /></td>' +
            '</tr>' +
        '</table>';

    el.html(html);

    el.find('input:text').blur(function () { hideError(); validateInputValue(this, true, $(this).attr('class')) });

    $('#calc-calculate').click(function (e) {
        hideError();

        document.getElementById('calc-result').value = "";

        e.stopPropagation();
        e.preventDefault();

        // check form values that they are numeric/date/etc based on their class names
        if (validateFormValues(el)) {
            sdFHOD();
        }
        return false;
    });

    $('#calc-reset').click(function () {
        $('#calc-value, #calc-date-1, #calc-result').val('');
        $(_e('calc-value')).focus();
        return false;
    });
}

function createFHOC(el)
{
    var html =
        '<table cellpadding="0" cellspacing="0">' +
            '<tr>' +
                '<td class="first-td">Vacant land:</td>' +
                '<td><select id="calc-vacant"><option value="Yes">Yes</option><option value="No">No</option></select></td>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td">Value of property: <span class="table-cur-right">$</span></td>' +
                '<td><input autocomplete="off" type="text" id="calc-value" class="numbers" maxlength="15" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td>Date of contract (dd/mm/yyyy):</td>' +
                '<td><input autocomplete="off" type="text" id="calc-date-1" class="datepicker" maxlength="10" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td>Estimated stamp duty: <span class="table-cur-right">$</span></td>' +
                '<td><input type="text" id="calc-result" disabled="true" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td> </td>' +
                '<td><input type="submit" id="calc-calculate" value="Calculate" /> <input type="submit" id="calc-reset" value="Reset" /></td>' +
            '</tr>' +
        '</table>';

    el.html(html);

    el.find('input:text').blur(function(){hideError();validateInputValue(this, true, $(this).attr('class'))});

    $('#calc-calculate').click(function(e) {
        hideError();

        document.getElementById('calc-result').value = "";

        e.stopPropagation();
        e.preventDefault();

        // check form values that they are numeric/date/etc based on their class names
        if(validateFormValues(el))
        {
            sdFHOC();
        }
        return false;
    });

    $('#calc-reset').click(function() {
        $('#calc-value, #calc-date-1, #calc-result').val('');
        $(_e('calc-value')).focus();
        return false;
    });
}

function createFHOCHS(el)
{
    var html =
        '<table cellpadding="0" cellspacing="0">' +
            '<tr>' +
                '<td class="first-td">Vacant Land:</td>' +
                '<td><select id="calc-vacant"><option value="Yes">Yes</option><option value="No">No</option></select></td>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td">Value of property: <span class="table-cur-right">$</span></td>' +
                '<td><input autocomplete="off" type="text" id="calc-value" class="numbers" maxlength="15" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td>Date of contract (dd/mm/yyyy):</td>' +
                '<td><input autocomplete="off" type="text" id="calc-date-1" class="datepicker" maxlength="10" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td>Interest purchased: <span class="table-cur-right">%</span></td>' +
                '<td><input autocomplete="off" type="text" id="calc-interest" class="percentage" maxlength="4" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td>Estimated stamp duty: <span class="table-cur-right">$</span></td>' +
                '<td><input type="text" id="calc-result" disabled="true" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td> </td>' +
                '<td><input type="submit" id="calc-calculate" value="Calculate" /> <input type="submit" id="calc-reset" value="Reset" /></td>' +
            '</tr>' +
        '</table>';

    el.html(html);

    el.find('input:text').blur(function(){hideError();validateInputValue(this, true, $(this).attr('class'))});

    $('#calc-calculate').click(function(e) {
        hideError();

        document.getElementById('calc-result').value = "";

        e.stopPropagation();
        e.preventDefault();

        // check form values that they are numeric/date/etc based on their class names
        if(validateFormValues(el))
        {
            sdFHOCHS();
        }

        return false;
    });

    $('#calc-reset').click(function() {
        $('#calc-value, #calc-date-1, #calc-result').val('');
        $(_e('calc-value')).focus();
        return false;
    });
}


function createSPCC(el)
{
    var html =
        '<table cellpadding="0" cellspacing="0">' +
            '<tr>' +
                '<td class="first-td">Vacant land:</td>' +
                '<td><select id="calc-vacant"><option value="Yes">Yes</option><option value="No">No</option></select></td>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td">Value of property: <span class="table-cur-right">$</span></td>' +
                '<td><input autocomplete="off" type="text" id="calc-value" class="numbers" maxlength="15" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td>Date of contract (dd/mm/yyyy):</td>' +
                '<td><input autocomplete="off" type="text" id="calc-date-1" class="datepicker" maxlength="10" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td>Estimated stamp duty: <span class="table-cur-right">$</span></td>' +
                '<td><input type="text" id="calc-result" disabled="true" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td> </td>' +
                '<td><input type="submit" id="calc-calculate" value="Calculate" /> <input type="submit" id="calc-reset" value="Reset" /></td>' +
            '</tr>' +
        '</table>';

    el.html(html);

    el.find('input:text').blur(function(){hideError();validateInputValue(this, true, $(this).attr('class'))});

    $('#calc-calculate').click(function(e) {
        hideError();

        document.getElementById('calc-result').value = "";

        e.stopPropagation();
        e.preventDefault();

        // check form values that they are numeric/date/etc based on their class names
        if(validateFormValues(el))
        {
            sdSPCC();
        }

        return false;
    });

    $('#calc-reset').click(function() {
        $('#calc-value, #calc-date-1, #calc-result').val('');
        $(_e('calc-value')).focus();
        return false;
    });
}

function createMVR(el)
{
    var html =
        '<table cellpadding="0" cellspacing="0">' +
            '<tr>' +
                '<td class="first-td"><span>Dutiable value of vehicle: </span><span class="table-cur-right">$</span></td>' +
                '<td><input autocomplete="off" type="text" id="calc-value" class="numbers" maxlength="15" /></td>' +
            '</tr>' +
                '<td><span>Estimated stamp duty: </span><span class="table-cur-right">$</span></td>' +
                '<td><input type="text" id="calc-result" disabled="true" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td> </td>' +
                '<td><input type="submit" id="calc-calculate" value="Calculate" /> <input type="submit" id="calc-reset" value="Reset" /></td>' +
            '</tr>' +
        '</table>';

    el.html(html);

    el.find('input:text').blur(function(){hideError();validateInputValue(this, true, $(this).attr('class'))});

    $('#calc-calculate').click(function(e) {
        hideError();

        document.getElementById('calc-result').value = "";

        e.stopPropagation();
        e.preventDefault();

        // check form values that they are numeric/date/etc based on their class names
        if(validateFormValues(el))
        {
            sdMVR();
        }

        return false;
    });

    $('#calc-reset').click(function() {
        $('#calc-value, #calc-date-1, #calc-result').val('');
        $(_e('calc-value')).focus();
        return false;
    });
}

function createSSC(el)
{
    var html =
        '<table cellpadding="0" cellspacing="0">' +
            '<tr>' +
                '<th></th>' +
                '<th></th>' +
                '<th>Annually</th>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td"><span class="table-tr-label">Gross Before-Tax Salary: <span class="required-field">*</span></span></td>' +
                '<td class="second-td"><span class="table-cur-right">$</span></td>' +
                '<td class="third-td"><input autocomplete="off" type="text" id="calc-value-1" class="numbers" maxlength="15" title="Enter the annual amount of your salary before tax and deductions."/></td>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td"><span class="table-tr-label">Proposed Salary Sacrifice Contributions: <span class="required-field">*</span></span><span class="table-cur-right">$</span></td>' +
                '<td class="second-td"><input autocomplete="off" type="text" id="calc-value-2" class="numbers" maxlength="15" title="Enter the annual amount of your proposed salary sacrifice contributions. You can sacrifice any amount up to a maximum of 50% of your salary." /></td>' +
                '<td class="third-td"></td>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td"><span class="table-tr-label">Net Salary Sacrifice Contributions:</span><span class="table-cur-right">$</span></td>' +
                '<td class="second-td"><input autocomplete="off" type="text" id="calc-value-3" class="numbers optional" maxlength="15" title="Net Salary Sacrifice Contributions after deduction of 15% superannuation contributions tax." /></td>' +
                '<td class="third-td"></td>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td"><span class="table-tr-label">Scheme Membership: <span class="required-field">*</span></span></td>' +
                '<td class="second-td">'+
                    '<select id="calc-membership">' +
                        '<option value="NTGPASS">NTGPASS</option>' +
                        '<option value="CSS">CSS</option>' +
                        '<option value="OTHER">OTHER</option>' +
                    '</select>' +
                '</td>' +
                '<td class="third-td"></td>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td"><span class="table-tr-label">Standard Employee Contributions per Fortnight:</span><span class="table-cur-right">$</span></td>' +
                '<td class="second-td"><input autocomplete="off" type="text" id="calc-value-4" class="numbers optional" maxlength="15" title="CSS members must continue contributing after tax employee contributions at their standard rate of 5%. NTGPASS members must continue contributing after tax employee contributions at 6%." /> <span class="table-cur-right">$</span></td>' +
                '<td class="third-td"><input autocomplete="off" type="text" id="calc-value-5" class="numbers optional" maxlength="15" title="The estimated annual amount of your after tax employee contributions to either the CSS or the NTGPASS. This is based on the employee contributions per fortnight." /></td>' +
            '</tr>' +
            '<tr>' +
                '<td> </td>' +
                '<td colspan="2"><input type="submit" id="calc-calculate" value="Calculate" /> <input type="submit" id="calc-reset" value="Reset" /></td>' +
            '</tr>' +
        '</table>' +
        '<h2>Results</h2>' +
        '<table cellpadding="0" cellspacing="0">' +
            '<tr>' +
                '<th></th>' +
                '<th>With Salary Sacrifice</th>' +
                '<th>Without Salary Sacrifice</th>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td"><span class="table-tr-label">Current Before Tax Salary</span><span class="table-cur-right">$</span></td>' +
                '<td class="second-td"><input autocomplete="off" readonly="readonly" type="text" id="calc-resultrow-1-1" class="numbers optional" maxlength="15" title="" /><span class="table-cur-right">$</span></td>' +
                '<td class="third-td"><input autocomplete="off" readonly="readonly" type="text" id="calc-resultrow-1-2" class="numbers optional" maxlength="15" title="" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td"><span class="table-tr-label">Salary Sacrifice Contributions:</span><span class="table-cur-right">$</span></td>' +
                '<td class="second-td"><input autocomplete="off" readonly="readonly" type="text" id="calc-resultrow-2-1" class="numbers optional" maxlength="15" title="The amount of your proposed salary sacrifice contributions before tax." /></td>' +
                '<td class="third-td"></td>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td"><span class="table-tr-label">Taxable Income:</span><span class="table-cur-right">$</span></td>' +
                '<td class="second-td"><input autocomplete="off" readonly="readonly" type="text" id="calc-resultrow-3-1" class="numbers optional" maxlength="15" title="" /><span class="table-cur-right">$</span></td>' +
                '<td class="third-td"><input autocomplete="off" readonly="readonly" type="text" id="calc-resultrow-3-2" class="numbers optional" maxlength="15" title="" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td"><span class="table-tr-label">Income Tax Payable:</span><span class="table-cur-right">$</span></td>' +
                '<td class="second-td"><input autocomplete="off" readonly="readonly" type="text" id="calc-resultrow-4-1" class="numbers optional" maxlength="15" title="Tax rates are based on current tax laws as at 01 July 2008." /><span class="table-cur-right">$</span></td>' +
                '<td class="third-td"><input autocomplete="off" readonly="readonly" type="text" id="calc-resultrow-4-2" class="numbers optional" maxlength="15" title="Tax rates are based on current tax laws as at 01 July 2008." /></td>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td"><span class="table-tr-label">Standard Contributions:</span><span class="table-cur-right">$</span></td>' +
                '<td class="second-td"><input autocomplete="off" readonly="readonly" type="text" id="calc-resultrow-5-1" class="numbers optional" maxlength="15" title="This is the annual amount of your after tax employee contributions. If you are a CSS member, it is based on a standard contribution rate of 5%. For NTGPASS members it is based on a contribution rate of 6%." /><span class="table-cur-right">$</span></td>' +
                '<td class="third-td"><input autocomplete="off" readonly="readonly" type="text" id="calc-resultrow-5-2" class="numbers optional" maxlength="15" title="This is the annual amount of your after tax employee contributions. If you are a CSS member, it is based on a standard contribution rate of 5%. For NTGPASS members it is based on a contribution rate of 6%." /></td>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td"><span class="table-tr-label">Voluntary Contributions:</span></td>' +
                '<td class="second-td"><span class="table-cur-right">$</span></td>' +
                '<td class="third-td"><input autocomplete="off" readonly="readonly" type="text" id="calc-resultrow-6-1" class="numbers optional" maxlength="15" title="The amount of your proposed after tax voluntary contributions." /></td>' +
            '</tr>' +
            '<tr>' +
                '<td class="first-td"><span class="table-tr-label">Net Take Home Pay:</span><span class="table-cur-right">$</span></td>' +
                '<td class="second-td"><input autocomplete="off" readonly="readonly" type="text" id="calc-resultrow-7-1" class="numbers optional" maxlength="15" title="" /><span class="table-cur-right">$</span></td>' +
                '<td class="third-td"><input autocomplete="off" readonly="readonly" type="text" id="calc-resultrow-7-2" class="numbers optional" maxlength="15" title="" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td colspan="2"><span class="table-tr-label-large">Difference in take home pay resulting from salary sacrificing instead of after tax voluntary contributions:</span><span class="table-cur-right">$</span></td>' +
                '<td><input autocomplete="off" readonly="readonly" type="text" id="calc-resultrow-8-1" class="numbers optional" maxlength="15" title="" /></td>' +
            '</tr>' +
        '</table>';

    el.html(html);

    el.find('input:text').blur(function(){hideError();validateInputValue(this, true, $(this).attr('class'))});

    $('#calc-calculate').click(function(e) {
        hideError();

        //document.getElementById('calc-result').value = "";

        e.stopPropagation();
        e.preventDefault();

        // check form values that they are numeric/date/etc based on their class names
        if(validateFormValues(el))
        {
            calcSalarySacrifice();
        }

        return false;
    });

    $('#calc-reset').click(function() {
        $(document.getElementById('calculator-wrapper')).find('input:text').val('');
        $(_e('calc-value-1')).focus();
        return false;
    });
}

function createDISCDisclaimer(el)
{
    var html =
        '<div id="disc-disclaimer">' +
            '<h2>Disclaimer</h2>' +
            '<p>The Northern Territory Government Death and Invalidity Scheme (NTGDIS) calculator has been provided by the Commissioner of Superannuation in good faith. Every reasonable attempt has been taken to ensure the information, and projections produced are accurate and complete. No guarantee is provided regarding the accuracy of the projected benefit. The calculator is not intended to be comprehensive. It does not constitute nor should it be treated as legal or financial advice or opinion.</p>' +
            '<p>The accuracy of the results will depend upon the accuracy of information input and the assumptions. Certain assumptions are made in the calculation of the projected benefit. These assumptions are detailed on the benefit projection page.</p>' +
            '<p>The Commissioner of Superannuation makes no representations in respect of, and, to the extent permitted by law, exclude all warranties or assurances in relation to, the accuracy, currency, or completeness of any information and projections provided by the calculator and accepts no liability whatsoever for any loss or damage however cause as a result of any persons relying in whole or in part on the information or projections obtained by using the calculator.</p>' +
            '<p><input type="submit" value="I agree, show calculator" id="btn-show-disc" />' +
        '</div>';

    el.html(html);

    $(document.getElementById('btn-show-disc')).click(function(e) {
        e.stopPropagation();
        e.preventDefault();

        $(document.getElementById('disc-disclaimer')).slideUp('slow');
        createDISC(el);

        return false;
    });
}

function createDISC(el)
{
    var html =
        '<table id="disc-wrapper" cellpadding="0" cellspacing="0" style="display:none">' +
            '<tr>' +
                '<td class="first-td"><span>Gross Salary (Annual):</span><span class="table-cur-right">$</span></td>' +
                '<td><input autocomplete="off" type="text" id="calc-value" class="numbers" maxlength="15" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td>Date of Birth (dd/mm/yyyy):</td>' +
                '<td><input autocomplete="off" type="text" id="calc-date-1" class="datepicker" maxlength="10" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td>Effective Date (dd/mm/yyyy):</td>' +
                '<td><input autocomplete="off" type="text" id="calc-date-2" class="datepicker" maxlength="10" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td><span>Estimated Death/TPD Benefits:</span><span class="table-cur-right">$</span></td>' +
                '<td><input type="text" id="calc-result" disabled="true" /></td>' +
            '</tr>' +
            '<tr>' +
                '<td> </td>' +
                '<td><input type="submit" id="calc-calculate" value="Calculate" /> <input type="submit" id="calc-reset" value="Reset" /></td>' +
            '</tr>' +
        '</table>';

    el.html(html);

    el.find('input:text').blur(function(){hideError();validateInputValue(this, true, $(this).attr('class'))});

    $('#calc-calculate').click(function(e) {
        hideError();

        document.getElementById('calc-result').value = "";

        e.stopPropagation();
        e.preventDefault();

        // check form values that they are numeric/date/etc based on their class names
        if(validateFormValues(el))
        {
            calculateDISC();
        }

        return false;
    });

    $('#calc-reset').click(function() {
        $(document.getElementById('calculator-wrapper')).find('input:text').val('');
        $(_e('calc-value')).focus();
        return false;
    });

    $('#calc-date-1, #calc-date-2').datepicker({
        dateFormat: 'dd/mm/yy'
    });

    $(document.getElementById('disc-wrapper')).slideDown('slow');
}





/*
    GENERAL CALCULATION FUNCTIONS
    ---------------------------------------------------------------------------------------------------- */
	
function duty_2017_18(dutiableAmount)
{
    var v = dutiableAmount/1000,
        x = (0.06571441*v*v)+15*v

    if ((((x*100) % 1) > 0.99999) || (((x*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
            x = Math.round(x*100)/100;
    }

    var y = 0.0495*dutiableAmount

    if ((((y*100) % 1) > 0.99999) || (((y*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
            y = Math.round(y*100)/100;
    }

    var z = 0.0575*dutiableAmount

    if ((((z*100) % 1) > 0.99999) || (((z*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
            z = Math.round(z*100)/100;
    }
	
	var a = 0.0595*dutiableAmount

    if ((((a*100) % 1) > 0.99999) || (((a*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
            a = Math.round(a*100)/100;
    }

    if(dutiableAmount<=0)
        return 0;
    else if(dutiableAmount<=525000)
        return x;
    else if(525000.01 <= dutiableAmount && 2999999.99 >= dutiableAmount)
        return y;
    else if(3000000.00 <= dutiableAmount && 4999999.99 >= dutiableAmount)
        return z;
	else
		return a;
}

function dutyThird(dutiableAmount)
{
    var v = dutiableAmount/1000,
        x = (0.06571441*v*v)+15*v

    if ((((x*100) % 1) > 0.99999) || (((x*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
            x = Math.round(x*100)/100;
    }

    var y = 0.0495*dutiableAmount

    if ((((y*100) % 1) > 0.99999) || (((y*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
            y = Math.round(y*100)/100;
    }

    var z = 0.0545*dutiableAmount

    if ((((z*100) % 1) > 0.99999) || (((z*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
            z = Math.round(z*100)/100;
    }

    if(dutiableAmount<=0)
        return 0;
    else if(dutiableAmount<=525000)
        return x;
    else if(525000.01 <= dutiableAmount && 2999999.99 >= dutiableAmount)
        return y;
    else
        return z;
}

function dutyOld(dutiableAmount)
{
    var v = dutiableAmount/1000,
        x = (0.065*v*v)+21*v;

    if ((((x*100) % 1) > 0.99999) || (((x*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
        x = Math.round(x*100)/100;
    }

    var y = 0.054*dutiableAmount;

    if ((((y*100) % 1) > 0.99999) || (((y*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
        y = Math.round(y*100)/100;
    }

    if(dutiableAmount<=0)
        return 0;
    else if(dutiableAmount<=500000)
        return x;
    else
        return y;
}

function dutyNew(dutiableAmount)
{
    var v = dutiableAmount/1000,
        x = (0.06571441*v*v)+15*v;

    if ((((x*100) % 1) > 0.99999) || (((x*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
        x = Math.round(x*100)/100;
    }

    var y = 0.0495*dutiableAmount

    if ((((y*100) % 1) > 0.99999) || (((y*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
        y = Math.round(y*100)/100;
    }

    if(dutiableAmount<=0)
        return 0;
    else if(dutiableAmount<=525000)
        return x;
    else
        return y;
}

//Rounding down to the nearest 5 cents
function flr(num)
{
    var x = num*100;

    //need an IF function here so that iff (X % 1) is greater than say 0.99999 or less than 0.00001 (in the range of the usual errors by the computer)
    //then use the Math.round function to round it to the nearest 1 (either up or down)
    // the IF function should eliminate any chance of rounding a geniunely correct number
    if (((x % 1) > 0.99999) || ((x % 1) < 0.00001))
    {
        x = Math.round(x);
    }

    var y = (x-(x % 5))/100;
    return y;
}

//Rounding down to the nearest 1 cent
function flr2(num)
{
    var x = num*100,
        y = (x-(x % 1))/100;
    return y;
}

function addCommas(nStr)
{
    nStr += '';
    var x = nStr.split('.'),
        x1 = x[0],
        x2 = (x.length > 1) ? '.' + x[1] : '',
        rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1))
    {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
}

/*
    STAMP DUTY CALCULATOR
    ---------------------------------------------------------------------------------------------------- */


function sdCONV()
{
    var date = auDate($('#calc-date-1').val());
    var budget_2008_09  = new Date("05/06/2008");
    var budget_2011_12 = new Date("07/01/2011");
	var budget_2017_18 = new Date("07/01/2017")
    var price     = $('#calc-value').val();

    console.log(price);
    console.log(date);

    if (date < budget_2008_09)
    {
        sdConvOriginal(date, price);
    }
    else if (budget_2008_09 < date && budget_2011_12 > date)
    {
        sdConv_2008_09(date, price);
    }
    else if (budget_2011_12 < date && budget_2017_18 > date)
    {
        sdConv_2011_12(date, price);
    }
	else
	{
		sdConv_2017_18(date, price);
	}
}

function sdConv_2017_18(date, price)
{
    var result = null;

    result = duty_2017_18(price); //unrounded duty

    if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
        result = Math.round(result*100)/100;
    }
    result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
    result = flr(result); //rounds down to the nearest 5 cents

    if(result<0)
        result = 0;

    console.log(result);

    $('#calc-result').val( addCommas(result.toFixed(2)) );
}

function sdConv_2011_12(date, price)
{
    var result = null;

    result = dutyThird(price); //unrounded duty

    if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
        result = Math.round(result*100)/100;
    }
    result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
    result = flr(result); //rounds down to the nearest 5 cents

    if(result<0)
        result = 0;

    $('#calc-result').val( addCommas(result.toFixed(2)) );
}

function sdConv_2008_09(date, price)
{
    var result = dutyNew(price); //unrounded duty

    if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
        result = Math.round(result*100)/100;
    }
    result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
    result = flr(result); //rounds down to the nearest 5 cents

    if(result<0)
        result = 0;

    $('#calc-result').val( addCommas(result.toFixed(2)) );
}

function sdConvOriginal(date, price)
{
    var result = dutyOld(price); //unrounded duty

    if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
        result = Math.round(result*100)/100;
    }
    result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
    result = flr(result); //rounds down to the nearest 5 cents

    if(result<0)
        result = 0;

    $('#calc-result').val( addCommas(result.toFixed(2)) );
}


//FHOD


//FHOC
function fhoc(date) {
    var aFHOCdate = new Date("2005/05/02");
    var bFHOCdate = new Date("2005/06/19");
    var cFHOCdate = new Date("2007/04/30");
    var dFHOCdate = new Date("2008/05/05");
    var eFHOCdate = new Date("2010/05/04");

    if (date <= aFHOCdate)
        return 125000;
    else if (date <= bFHOCdate)
        return 200000;
    else if (date <= cFHOCdate)
        return 225000;
    else if (date <= dFHOCdate)
        return 350000;
    else if (date < eFHOCdate)
        return 385000;
    else
        return 540000;
}


//	PPRR
function sdPPRR(date, price)
{
    var budget_2008_09  = new Date("06/05/2008"),
        budget_2011_12 = new Date("07/01/2011"),
        budget_2008_093 = new Date("12/04/2012"),
        budget_pprr_2017_18 = new Date("07/01/2017"),
        date      = auDate(document.getElementById('calc-date-1').value),
        price     = document.getElementById('calc-value').value;


    if (date < budget_2008_09)
    {
        sdPPRROld(date, price);
        
    }
        else if (budget_2008_09 <= date && budget_2011_12 >= date)
    {
        sdPPRRNew(date, price);

    }
        else if (budget_2011_12 <= date && budget_2008_093 > date)
    {
        sdPPRRThird(date, price);

    }
        else if (budget_2008_093 <= date && budget_pprr_2017_18 > date)
    {
        sdPPRRFourth(date, price);
        alert("From 04/12/2012 onwards, the PPRR is available to newly constructed homes ONLY");
    }
	else
	{
		sdPPRRFifth(date, price);
        alert("From 04/12/2012 onwards, the PPRR is available to newly constructed homes ONLY");
	}
}

//added extra dates to the function. created else if '(date>=bPPRRdate && date<=cPPRR)' to return 2500 and else return 3500, otherwise it is before 2005/06/19
//and returns 1500

function pprr(date)
{
    var aPPRRdate = new Date("06/19/2005"),
        bPPRRdate = new Date("06/20/2005"),
        cPPRRdate = new Date("05/03/2010"),
        dPPRRdate = new Date("05/04/2010"),
        ePPRRdate = new Date("12/04/2012");

            if(date<=aPPRRdate)
                return 1500;	
            
            else if (date>=bPPRRdate && date<=cPPRRdate)
                return	2500;
                
            else if (date>=cPPRRdate && date<ePPRRdate)
                return 3500;
                
            else
                return 7000;
}

function sdPPRROld(date, price)
{
    var result;

    result = dutyOld(price)- pprr(date); //unrounded duty

    if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
        result = Math.round(result*100)/100;
    }

    result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
    result = flr(result); //rounds down to the nearest 5 cents

    if(result<0)
        result = 0;

    document.getElementById('calc-result').value = addCommas(result.toFixed(2)); // changed 13/11/2009
}


function sdPPRRNew(date, price)
{
    var result;

    result = dutyNew(price)- pprr(date); //unrounded duty

    if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
        result = Math.round(result*100)/100;
    }

    result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
    result = flr(result); //rounds down to the nearest 5 cents

    if(result<0)
        result = 0;

    document.getElementById('calc-result').value = addCommas(result.toFixed(2)); //changed 13/11/2009
}

function sdPPRRThird(date, price)
{
    var result;

    result = dutyThird(price)- pprr(date); //unrounded duty

    if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
    {
        result = Math.round(result*100)/100;
    }

    result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
    result = flr(result); //rounds down to the nearest 5 cents

    if(result<0)
        result = 0;

    document.getElementById('calc-result').value = addCommas(result.toFixed(2)); //changed 13/11/2009
}

function sdPPRRFourth(date, price)
{
    var result;

        result = dutyThird(price)- pprr(date); //unrounded duty
        
        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }
        
        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents

        if(result<0)
            result = 0;

        document.getElementById('calc-result').value = addCommas(result.toFixed(2)); //changed 13/11/2009

}

function sdPPRRFifth(date, price)
{
    var result;

        result = duty_2017_18(price)- pprr(date); //unrounded duty
        
        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }
        
        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents

        if(result<0)
            result = 0;

        document.getElementById('calc-result').value = addCommas(result.toFixed(2)); //changed 13/11/2009

}

/*
    FHOC CALCULATOR
    ---------------------------------------------------------------------------------------------------- */
function sdFHOD(date, price) {

    var fhod_2016_17_May = new Date("05/24/2016"); //MM/DD./YYYY
    var fhod_2016_17_Sept = new Date("09/01/2016"); //MM/DD./YYYY
    var fhod_2017_18 = new Date("01/01/2017"); //MM/DD./YYYY 
    flag = "",
    date = auDate(document.getElementById('calc-date-1').value),
    price = document.getElementById('calc-value').value,
    isEstablishedHome = document.getElementById('calc-established').value;

    if (date >= fhod_2017_18 && price > 650000) {

        alert("For contracts entered into from 1 September 2016, the First Home Owner Discount (FHOD) only applies where the dutiable value of the home does not exceed $650 000.  For homes with a dutiable value of more than $650 000, a $10 000 FHOD is only available where the contract was entered into between 24 May 2016 and 31 December 2016.");
        sdCONV();
    }
    else if (date >= fhod_2016_17_Sept && isEstablishedHome == "Yes")
    {
        /*  Under the Territory Labor election 2016 commitment is for stamp duty on the first $500,000 is exempt. 
            This is capped (limited) to homes with a price less than or equal to $650,000. Although the former scheme must be preserved and continue
            to be applied to homes greater than $650,000 i.e. a discount of $10,000.
        */
        var stampDuty = null;

        stampDuty = dutyThird(price); //non-rounded duty

        if ((((stampDuty * 100) % 1) > 0.99999) || (((stampDuty * 100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            stampDuty = Math.round(stampDuty * 100) / 100;
        }
        stampDuty = flr2(stampDuty);  //rounds down to the nearest cent to avoid discrepancies caused by the way JavaScript handles numbers
        stampDuty = flr(stampDuty);   //rounds down to the nearest 5 cents
        
        var firstHomeOwnerDuty = null;
        if (price > 650000) 
        {
            firstHomeOwnerDuty = stampDuty - 10000;
        }
        else if (price <= 650000) 
        {
            firstHomeOwnerDuty = stampDuty - 23928.60;
            if (firstHomeOwnerDuty < 0) {
                firstHomeOwnerDuty = 0;
            }
        }
        document.getElementById('calc-result').value = addCommas(firstHomeOwnerDuty.toFixed(2));
    }

    else if (date >= fhod_2016_17_May && isEstablishedHome == "Yes")
    {
        // for established homes a stamp duty concession of 50% of duty otherwise payable is provided, up to a maximum concession of $10,000
        // so when consideration is above $449 229 the concession is capped.
        var stampDuty = null;

        stampDuty = dutyThird(price); //non-rounded duty

        if ((((stampDuty * 100) % 1) > 0.99999) || (((stampDuty * 100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            stampDuty = Math.round(stampDuty * 100) / 100;
        }
        stampDuty = flr2(stampDuty);  //rounds down to the nearest cent to avoid discrepancies caused by the way JavaScript handles numbers
        stampDuty = flr(stampDuty);   //rounds down to the nearest 5 cents

        var halfStampDuty = (stampDuty / 2);   //this provides duty at half the rate
    
        if (halfStampDuty > 10000) { halfStampDuty = stampDuty - 10000; }
        document.getElementById('calc-result').value = addCommas(halfStampDuty.toFixed(2));

    }
    else if (date >= fhod_2016_17_May && isEstablishedHome != "Yes")
    {

        alert("The First Home Owner Discount is not available for first home buyers that are building or acquiring a new home during this period.");
        sdCONV();

    }
    else if (date < fhod_2016_17_May )
    {

        alert("The First Home Owner Discount is available for first home buyers acquiring an established home on or after 24 May 2016.");
        sdCONV();
    }
}


function sdFHOC()
{
    var budget_2008_09  = new Date("05/06/2008"),
        budget_2011_12 = new Date("07/01/2011"),
        budget_2008_093 = new Date("12/04/2012"),
        fhoc_cap_date = new Date("01/01/2010"), //MM/DD/YYYY 1 January 2010
        fhoc_cap_land = 385000,
        fhoc_cap_home = 750000,
        flag = "",
        date = auDate(document.getElementById('calc-date-1').value),
        price = document.getElementById('calc-value').value,
        vacant = document.getElementById('calc-vacant').value;

    if(vacant=="Yes" && price>fhoc_cap_land && date>=fhoc_cap_date)
    {
        flag = "True";

        if (date < budget_2008_09)
        {
            sdFHOCOld(date,price,flag);
            alert("As the value of the land exceeds $385 000, you are not eligible for the First Home Owner Concession.\n\nHowever, you may be eligible for Principal Place of Residence Rebate.");
        }
        else if (budget_2008_09 <= date && budget_2011_12 >= date)
        {
            sdFHOCNew(date,price,flag);
            alert("As the value of the land exceeds $385 000, you are not eligible for the First Home Owner Concession.\n\nHowever, you may be eligible for Principal Place of Residence Rebate.");
        }
        else if (budget_2011_12 <= date && budget_2008_093 > date)
        {
            sdFHOCThird(date,price,flag);
            alert("As the value of the land exceeds $385 000, you are not eligible for the First Home Owner Concession.\n\nHowever, you may be eligible for Principal Place of Residence Rebate.");
        }
        else
        {
            sdFHOCFourth(date,price,flag);
            alert("The First Home Owners Concession is no longer available from 04/12/2012 onwards.");
        }
        
    }
    else if(vacant=="No" && price>fhoc_cap_home && date>=fhoc_cap_date)
    {
        flag = "True";

        if (date < budget_2008_09)
        {
            sdFHOCOld(date,price,flag);
            alert("As the value of the property exceeds $750 000, you are not eligible for the First Home Owner Concession.\n\nHowever, you may be eligible for Principal Place of Residence Rebate.");
        }
        else if (budget_2008_09 <= date && budget_2011_12 >= date)
        {
            sdFHOCNew(date,price,flag);
            alert("As the value of the property exceeds $750 000, you are not eligible for the First Home Owner Concession.\n\nHowever, you may be eligible for Principal Place of Residence Rebate.");
        }
        else if (budget_2011_12 <= date && budget_2008_093 > date)
        {
            sdFHOCThird(date,price,flag);
            alert("As the value of the property exceeds $750 000, you are not eligible for the First Home Owner Concession.\n\nHowever, you may be eligible for Principal Place of Residence Rebate.");
        }
        else
        {
            sdFHOCFourth(date,price,flag);
            alert("The First Home Owners Concession is no longer available from 04/12/2012 onwards.");
        }
    }
    else
    {
        flag = "False";

        if (date < budget_2008_09)
        {
            sdFHOCOld(date,price,flag);
        }
        else if (budget_2008_09 <= date && budget_2011_12 >= date)
        {
            sdFHOCNew(date,price,flag);
        }
        else if (budget_2011_12 <= date && budget_2008_093 > date)
        {
            sdFHOCThird(date,price,flag);
        }
        else
        {
            sdFHOCFourth(date,price,flag);
            alert("The First Home Owners Concession is no longer available from the 04/12/2012 onwards.");
        }
    }
}

function sdFHOCOld(date,price,flag)
{
    var result;
    var ineligible = flag;

    if (ineligible=="True")
    {
        result = dutyOld(price); //unrounded duty

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }
        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result =  flr(result); //rounds down to the nearest 5 cents
    }
    else if (ineligible=="False")
    {
        result = dutyOld(price) - flr(dutyOld(fhoc(date))); //unrounded duty

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }
        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents
    }

    if(result<0)
    {
        result = 0;
    }

    document.getElementById('calc-result').value = addCommas(result.toFixed(2)); //changed 13/11/2009
}

function sdFHOCNew(date,price,flag)
{
    var result;
    var ineligible = flag;

    if (ineligible=="True")
    {
        result = dutyNew(price); //unrounded duty

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }
        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result =  flr(result); //rounds down to the nearest 5 cents
    }
    else if (ineligible=="False")
    {
        result = dutyNew(price) - flr(dutyNew(fhoc(date))); //unrounded duty

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }
        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents
    }

    if(result<0)
    {
        result = 0;
    }

    document.getElementById('calc-result').value = addCommas(result.toFixed(2)); // chamged 13/11/2009
}

function sdFHOCThird(date,price,flag)
{
    var result;
    var ineligible = flag;

    if (ineligible=="True")
    {
        result = dutyThird(price); //unrounded duty

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }
        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result =  flr(result); //rounds down to the nearest 5 cents
    }
    else if (ineligible=="False")
    {
        result = dutyThird(price) - flr(dutyNew(fhoc(date))); //unrounded duty

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }
        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents
    }

    if(result<0)
    {
        result = 0;
    }

    document.getElementById('calc-result').value = addCommas(result.toFixed(2)); // chamged 13/11/2009
}

function sdFHOCFourth(date,price,flag)
{
    var result;
    var ineligible = flag;

    if (ineligible=="True")
    {
        result = 0; //unrounded duty
        
        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = 0;
        }
        result = 0; //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = 0; //rounds down to the nearest 5 cents
    }
    else if (ineligible=="False")
    {
        result = 0; //unrounded duty
        
        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = 0;
        }
        result = 0;//rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = 0; //rounds down to the nearest 5 cents
    }

    if(result<0)
    {
        result = 0;
    }

    document.getElementById('calc-result').value = addCommas(result.toFixed(2)); // chamged 13/11/2009
}



/*
    FHOCHS CALCULATOR
    ---------------------------------------------------------------------------------------------------- */

function sdFHOCHS()
{
    var budget_2008_09  = new Date("05/06/2008"),
        budget_2011_12 = new Date("07/01/2011"),
        budget_2008_093 = new Date("12/04/2012"),
        fhoc_cap_date = new Date("01/01/2010"),
        fhoc_cap_land = 385000,
        fhoc_cap_home = 750000,
        ownership = parseFloat(document.getElementById('calc-interest').value),
        flag = "",
        date = auDate(document.getElementById('calc-date-1').value),
        price = document.getElementById('calc-value').value,
        vacant = document.getElementById('calc-vacant').value;



    if(vacant=="Yes" && price>fhoc_cap_land && date>=fhoc_cap_date)
    {
        flag = "True";

        if (date < budget_2008_09)
        {
            sdFHOCHSOld(date,price,ownership,flag);
            alert("As the value of the land exceeds $385 000, you are not eligible for the First Home Owner Concession.\n\nHowever, you may be eligible for Principal Place of Residence Rebate.");			
        }
        else if (budget_2008_09 <= date && budget_2011_12 >= date)
        {
            sdFHOCHSNew(date,price,ownership,flag);
            alert("As the value of the land exceeds $385 000, you are not eligible for the First Home Owner Concession.\n\nHowever, you may be eligible for Principal Place of Residence Rebate.");			
        }
        else if (budget_2011_12 <= date && budget_2008_093 > date)
        {
            sdFHOCHSThird(date,price,ownership,flag);
            alert("As the value of the land exceeds $385 000, you are not eligible for the First Home Owner Concession.\n\nHowever, you may be eligible for Principal Place of Residence Rebate.");			
        }
        else
        {
            sdFHOCHSFourth(date,price,ownership,flag);
            alert("The First Home Owners Concession is no longer available from 04/12/2012 onwards.");
        }
        
    }
    else if(vacant=="No" && price>fhoc_cap_home && date>=fhoc_cap_date)
    {
        flag = "True";

        if (date < budget_2008_09)
        {
            sdFHOCHSOld(date,price,ownership,flag);
            alert("As the value of the property exceeds $750 000, you are not eligible for the First Home Owner Concession.\n\nHowever, you may be eligible for Principal Place of Residence Rebate.");
        }
        else if (budget_2008_09 <= date && budget_2011_12 >= date)
        {
            sdFHOCHSNew(date,price,ownership,flag);
            alert("As the value of the property exceeds $750 000, you are not eligible for the First Home Owner Concession.\n\nHowever, you may be eligible for Principal Place of Residence Rebate.");
        }
        else if (budget_2011_12 <= date && budget_2008_093 > date)
        {
            sdFHOCHSThird(date,price,ownership,flag);
            alert("As the value of the property exceeds $750 000, you are not eligible for the First Home Owner Concession.\n\nHowever, you may be eligible for Principal Place of Residence Rebate.");
        }
        else
        {
            sdFHOCHSFourth(date,price,ownership,flag);
            alert("The First Home Owners Concession is no longer available from 04/12/2012 onwards.");
        }
        
    }
    else
    {
        flag = "False";

        if (date < budget_2008_09)
        {
            sdFHOCHSOld(date,price,ownership,flag);
        }
        else if (budget_2008_09 <= date && budget_2011_12 >= date)
        {
            sdFHOCHSNew(date,price,ownership,flag);
        }
        else if (budget_2011_12 <= date && budget_2008_093 > date)
        {
            sdFHOCHSThird(date,price,ownership,flag);
        }
        else 
        {
            sdFHOCHSFourth(date,price,ownership,flag);
            alert("The First Home Owners Concession is no longer available from 04/12/2012 onwards.");
        }

    }

}

function sdFHOCHSOld(date,price,ownership,flag)
{
    var result,
        ineligible = flag;

    if (ineligible=="True")
    {
        result = dutyOld(price)*ownership/100;

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }

        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents
    }
    else if (ineligible=="False")
    {
        //result = flr( dutyOld(price)*ownership/100 - flr(dutyOld(fhoc(date))) );
        result = dutyOld(price)*ownership/100 - flr(dutyOld(fhoc(date)));//unrounded duty

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }

        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents
    }

    if(result<0)
    {
        result = 0;
    }

    document.getElementById('calc-result').value = addCommas(result.toFixed(2));
}

function sdFHOCHSNew(date,price,ownership,flag)
{
    var result,
        ineligible = flag;

    if (ineligible=="True")
    {
        result = dutyNew(price)*ownership/100;	//unrounded duty

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }

        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents
    }
    else if (ineligible=="False")
    {
        result = dutyNew(price)*ownership/100 - flr(dutyNew(fhoc(date)));	//unrounded duty

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }

        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents
    }
    if(result<0)
    {
        result = 0;
    }

    document.getElementById('calc-result').value = addCommas(result.toFixed(2));
}

function sdFHOCHSThird(date,price,ownership,flag)
{
    var result,
        ineligible = flag;

    if (ineligible=="True")
    {
        result = dutyThird(price)*ownership/100;	//unrounded duty

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }

        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents
    }
    else if (ineligible=="False")
    {
        result = dutyThird(price)*ownership/100 - flr(dutyNew(fhoc(date)));	//unrounded duty

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }

        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents
    }
    if(result<0)
    {
        result = 0;
    }

    document.getElementById('calc-result').value = addCommas(result.toFixed(2));
}

function sdFHOCHSFourth(date,price,ownership,flag)
{
    var result;
    var ineligible = flag;

    if (ineligible=="True")
    {
        result = 0;	//unrounded duty
        
        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = 0;
        }
        
        result = 0; //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = 0; //rounds down to the nearest 5 cents
    }
    else if (ineligible=="False")
    {
        result = 0;	//unrounded duty
        
        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = 0;
        }
    
        result = 0; //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = 0; //rounds down to the nearest 5 cents
    }
    if(result<0)
    {
        result = 0;
    }

    document.getElementById('calc-result').value = addCommas(result.toFixed(2));
}
        


/*
    SPCC CALCULATOR
    ---------------------------------------------------------------------------------------------------- */

//Created this function
function spcc(date)
{
    var SPCCdate1 = new Date("2010/05/04");
    var SPCCdate2 = new Date("2015/04/28");
    
    if (date>=SPCCdate2){
    return 10000;
    }
    else{
    return 8500;
    }
}

//Created this function
function sdSPCC()
{
    var budget_2008_09  = new Date("05/04/2010"),
        budget_2011_12 = new Date("07/01/2011"),
        budget_2008_093 = new Date("04/28/2015"),
		budget_spcc_2017_18 = new Date("07/01/2017"),
        spcc_cap_date = new Date("05/04/2010"), //MM/DD/YYYY 1 January 2010
        spcc_cap_land = 385000,
        spcc_cap_home = 750000,
        flag = "",
        date = auDate(document.getElementById('calc-date-1').value),
        price = document.getElementById('calc-value').value,
        vacant = document.getElementById('calc-vacant').value;

    if(vacant=="Yes" && price>spcc_cap_land && date>=spcc_cap_date)
    {
        flag = "True";

        alert("As the value of the land exceeds $385 000, you are not eligible for the Senior, Pensioner and Carer Concession.\n\nHowever, you may be eligible for Principal Place of Residence Rebate.");
    }
    else if(vacant=="No" && price>spcc_cap_home && date>=spcc_cap_date)
    {
        flag = "True";

        alert("As the value of the property exceeds $750 000, you are not eligible for the Senior, Pensioner and Carer Concession.\n\nHowever, you may be eligible for Principal Place of Residence Rebate.");
    }
    else
    {
        flag = "False";
    }

    if (date < budget_2011_12)
    {
        sdSPCCNew(date,price,flag);
    }
    else if (budget_2011_12 <= date && budget_spcc_2017_18 >= date)
    {
        sdSPCCThird(date,price,flag);
    }
	else
	{
		sdSPCCFourth(date,price,flag);
	}

}

// Created this function

function sdSPCCNew(date,price,flag)
{
    var result,
        ineligible = flag;

    if (ineligible=="True")
    {
        result = dutyNew(price); //unrounded duty

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }

        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents
    }
    else if (ineligible=="False")
    {
        result = dutyNew(price) - spcc(date);

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }

        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents
    }

    if(result<0)
    {
        result = 0;
    }

    document.getElementById('calc-result').value = addCommas(result.toFixed(2));
}

function sdSPCCThird(date,price,flag)
{
    var result,
        ineligible = flag;

    if (ineligible=="True")
    {
        result = dutyThird(price); //unrounded duty

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }

        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents
    }
    else if (ineligible=="False")
    {
        result = dutyThird(price) - spcc(date);

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }

        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents
    }

    if(result<0)
    {
        result = 0;
    }

    document.getElementById('calc-result').value = addCommas(result.toFixed(2));
}

function sdSPCCFourth(date,price,flag)
{
    var result,
        ineligible = flag;

    if (ineligible=="True")
    {
        result = duty_2017_18(price); //unrounded duty

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }

        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents
    }
    else if (ineligible=="False")
    {
        result = duty_2017_18(price) - spcc(date);

        if ((((result*100) % 1) > 0.99999) || (((result*100) % 1) < 0.00001)) //minute variances can occur during the previous line
        {
            result = Math.round(result*100)/100;
        }

        result = flr2(result); //rounds down to the nearest cent to avoid discrepencies caused by the way javascript handles numbers
        result = flr(result); //rounds down to the nearest 5 cents
    }

    if(result<0)
    {
        result = 0;
    }

    document.getElementById('calc-result').value = addCommas(result.toFixed(2));
}



/*
    MVR CALCULATOR
    ---------------------------------------------------------------------------------------------------- */

function sdMVR()
{
    var val = document.getElementById('calc-value'),
        av = parseFloat(val.value, 10),
        c = 0,
        test = 0,
        price = val.value,
        resInput = document.getElementById('calc-result');

    if (av <= 0)
    {
        resInput.value = "0.00";
    }
    else
    {
        c = (Math.ceil(av/100))*3;
        var r = c.toFixed(2),
            strCents = "" + r,
            len = strCents.length,
            roundCents= strCents.substring(len - 1, len);
 
        if (roundCents < 5)
        {
            roundCents=0;
        }
        else
        {
            roundCents=5;
        }

        resInput.value = addCommas(strCents.substring(0, len - 1)+roundCents);
    }

    if (av < 0)
    {
        resInput.value = "0.00";
    }
    
    
}

/*
    SALARY SACRIFICE CALCULATOR
    ---------------------------------------------------------------------------------------------------- */

function calcSalarySacrifice()
{
    // get values
    var value1 = document.getElementById('calc-value-1').value, //K15
        value2 = document.getElementById('calc-value-2').value, //I17
        value3 = document.getElementById('calc-value-3').value, //I18
        value4 = document.getElementById('calc-value-4').value, //I24
        value5 = document.getElementById('calc-value-5').value, //K24
        value6 = document.getElementById('calc-membership').value; //I21

    document.getElementById('calc-value-3').value = Math.round(parseInt(value2) * 0.85);

    if (value6=="CSS") {
        var I24temp = Math.round(parseInt(value1) / 520);
        document.getElementById('calc-value-4').value = Math.round(I24temp);
    }
    else if (value6=="NTGPASS") {
        var I24temp = roundPlaces(parseInt(value1)*12/313*0.06,1);
        document.getElementById('calc-value-4').value = Math.round(I24temp);
    }
    else if (value6=="OTHER") {
        var I24temp = 0;
        document.getElementById('calc-value-4').value = 0;
    }

    document.getElementById('calc-value-5').value = Math.round(I24temp * 26);
    document.getElementById('calc-resultrow-1-1').value = parseInt(value1);
    document.getElementById('calc-resultrow-1-2').value = parseInt(value1);
    document.getElementById('calc-resultrow-2-1').value = parseInt(value2);
    document.getElementById('calc-resultrow-3-1').value = parseInt(document.getElementById('calc-resultrow-1-1').value)- parseInt(document.getElementById('calc-resultrow-2-1').value);
    document.getElementById('calc-resultrow-3-2').value = parseInt(document.getElementById('calc-resultrow-1-2').value);

    document.getElementById('calc-resultrow-4-1').value = Math.round(taxDueOnIncome(parseInt(document.getElementById('calc-resultrow-3-1').value)))+(0.015*parseInt(document.getElementById('calc-resultrow-3-1').value));
    document.getElementById('calc-resultrow-4-2').value = Math.round(taxDueOnIncome(parseInt(document.getElementById('calc-resultrow-3-2').value)))+(0.015*parseInt(document.getElementById('calc-resultrow-3-2').value));

    document.getElementById('calc-resultrow-5-1').value = parseInt(document.getElementById('calc-value-5').value);
    document.getElementById('calc-resultrow-5-2').value = parseInt(document.getElementById('calc-value-5').value);

    document.getElementById('calc-resultrow-6-1').value = parseInt(document.getElementById('calc-value-2').value)

    document.getElementById('calc-resultrow-7-1').value = parseInt(document.getElementById('calc-resultrow-3-1').value) - parseInt(document.getElementById('calc-resultrow-4-1').value) - parseInt(document.getElementById('calc-resultrow-5-1').value);
    document.getElementById('calc-resultrow-7-2').value = parseInt(document.getElementById('calc-resultrow-3-2').value) - parseInt(document.getElementById('calc-resultrow-4-2').value) - parseInt(document.getElementById('calc-resultrow-5-2').value) - parseInt(document.getElementById('calc-resultrow-6-1').value);

    document.getElementById('calc-resultrow-8-1').value = parseInt(document.getElementById('calc-resultrow-7-2').value) - parseInt(document.getElementById('calc-resultrow-7-2').value);

    return false;
}


//
// This is a custom function that rounds any number to a specified number of
// decimal places. eg. roundPlaces(5.55318,3) becomes 5.553.
//
// This was necessary to emulate the ROUNDUP() functionality in MS Excel for
// which this calculator was designed.
//

function roundPlaces (n, d) {
    n = n - 0;
    if (d == null) d = 2;
    var f = Math.pow(10, d);
    n += Math.pow(10, - (d + 1));
    n = Math.ceil(n * f) / f;
    n += Math.pow(10, - (d + 1));
    n += '';
    return d == 0 ? n.substring(0, n.indexOf('.')) :
      n.substring(0, n.indexOf('.') + d + 1);
}

// This function takes income 'n' as a parameter (e.g. 80000)
// and returns the amount of tax due both from the tax boundary and
// the excess.
//
// A typical change to this function would be to change the tax boundaries
// eg. if you want to add another tax range just add another else if
// as follows:
//
//      else if ((n >= 60000) && (n < 80000)) { // 60000-79999
//         .. CODE HERE
//      }
//      else if ((n >= 80000) { // 80000+
//         .. CODE HERE
//      }
//
// That would effectively add a new bracket between 60000 and 80000 and
// change the last tax bracket to over 80000.
//
// This should all be self-explanatory.
//

function taxDueOnIncome(n) {
    var boundaryTax = 0,
        excessPercentage = 0,
        excess = 0;

    if (n <= 6000) {                             // 0-6000
        boundaryTax = 0;
        excessPercentage = 0.0;
        excess = 0;
    }
    else if ((n > 6001) && (n <= 37000)) {       // 6001-35000
        boundaryTax = 0;
        excessPercentage = 15.0;
        excess = (n - 6001);
    }
    else if ((n > 37001) && (n <= 80000)) {      // 35001-80000
        boundaryTax = 4650;
        excessPercentage = 30.0;
        excess = (n - 37001);
    }
    else if ((n > 80001) && (n <= 180000)) {     // 80001-180000
        boundaryTax = 17550;
        excessPercentage = 37.0;
        excess = (n - 80001);
    }
    else if ((n > 180001)) {                     // 180001+
        boundaryTax = 54550;
        excessPercentage = 45.0;
        excess = (n - 180001);
    }

    return (boundaryTax + (excess*(excessPercentage/100)));
}

/*
    DEATH AND INVALIDITY CALCULATOR
    ---------------------------------------------------------------------------------------------------- */

function calculateDISC(start, end, salary) {
    var age = DateDiffYears(start, end),
        years_calc = Reduce_service(start, end),
        mysalary = document.getElementById("calc-value").value,
        est_benefit = 0;

    if (age >= 60) {
        est_benefit = 0;
    }
    else {
        est_benefit = years_calc * mysalary * 0.175;
    };

    var new_est_benefit = new Number(est_benefit),
        round_est_benefit = (new_est_benefit.toFixed(2));

    if (round_est_benefit < 0) {
        round_est_benefit = 0.00
    }
    document.getElementById('calc-result').value = addCommas(round_est_benefit);
    return false;
}

// Calculates the number of years between two dates.
// start - a date object that defines the beginning of the range
// end - a date object that defines the end of the range
function DateDiffYears(start, end)
{
    var mydate = document.getElementById("calc-date-1").value,
        mydate2 = document.getElementById("calc-date-2").value;

    var day = (mydate.substring(0, 2)),
        month = (1*(mydate.substring(3, 5)))-1,
        year = (mydate.substring(6, 10)),
        day3 = (mydate2.substring(0, 2)),
        month3 = (1*(mydate2.substring(3, 5)))-1,
        year3 = (mydate2.substring(6, 10)),
        start = new Date();

    start.setFullYear(year, month, day);

    var end = new Date();
    end.setFullYear(year3, month3, day3);

    var years = end.getFullYear() - start.getFullYear(),
        month1 = start.getMonth(),
        month2 = end.getMonth(),
        day1 = start.getDate(),
        day2 = end.getDate();

    if (month2 < month1) {
        years -= 1;
    };

    if (month2 == month1 && day2 < day1) {
        years -= 1;
    };

    if (years < 0) {
        years = 0;
    }

    return years;
}

// Calculates the number of months between two dates.
// start - a date object that defines the beginning of the range
// end - a date object that defines the end of the range
function DateDiffMonths(start, end) {
    var years1 = DateDiffYears(start, end);
    var years2 = end.getFullYear() - start.getFullYear();
    var months = years1 * 12
    var month1 = start.getMonth()-1
    var month2 = end.getMonth()-1
    var day1 = start.getDate()
    var day2 = end.getDate()
    if (years1 != years2) {
        months = months + 11 - (month1 - month2);
    }
    else {
        months = months + (month2 - month1);
        if (day2 < day1)
        { months -= 1; }
    };

    return months;
}

// Calculates the service in years and days between two dates.
// start - a date object that defines the beginning of the range
// end - a date object that defines the end of the range set as member's 65th birthday
function service_years_days(start, end) {

    var mydate = document.getElementById("calc-date-2").value,
        mydate2 = document.getElementById("calc-date-1").value;

    var years1 = DateDiffYears(start, end),
        day1 = (mydate.substring(0, 2)),
        month1 = (1*(mydate.substring(3, 5)))-1,
        year_start = (mydate.substring(6, 10)),
        day2 = (mydate2.substring(0, 2)),
        month2 = (1*(mydate2.substring(3, 5)))-1,
        year_end_ini = (mydate2.substring(6, 10)),
        one_day = 1000 * 60 * 60 * 24,
        myDate = new Date();

    if (years1 < 60) {
        var year_end = 1 * year_end_ini + 65
    }

    if (month1 > month2) {
        myDate.setFullYear(year_end - 1, month1, day1);
    }
    else if (month1 < month2) {
        myDate.setFullYear(year_end, month1, day1);
    }
    else if (month1 == month2 && day1 < day2) {
        myDate.setFullYear(year_end, month1, day1);
    }
    else if (month1 == month2 && day1 > day2) {
        myDate.setFullYear(year_end - 1, month1, day1);
    }
    else {
        myDate.setFullYear(year_end, month1, day1);

    };

    var mystartdate = new Date();
    mystartdate.setFullYear(year_start, month1, day1);

    var myenddate = new Date();
    myenddate.setFullYear(year_end, month2, day2);

    var years = 0;
    years = myDate.getFullYear() - mystartdate.getFullYear();

    var mynewstart = new Date();
    mynewstart.setFullYear(myDate.getFullYear(), month1, 1 * day1 + 2);

    var mynewend = new Date();
    mynewend.setFullYear(myenddate.getFullYear(), month2, day2);

    var No_ofdays = 0;
    No_ofdays = Math.ceil(mynewend.getTime() - mynewstart.getTime()) / (one_day);

    var No_ofdays_leap = 0;
    No_ofdays_leap = (1 * No_ofdays - 1);

    var res = year_end % 4,
        service = 0;

    if (res == 0 && month2 > 1) {
        service = years + (No_ofdays_leap / 365); // changed to 365 - leap year no longer relevant
    }
    else {
        service = years + (No_ofdays / 365);
    };

    var total_service = new Number(service);

    var round_service = (total_service.toFixed(5));

   return round_service;
}



    // Calculates the service in years and days between two dates used to reduce prospective service
    // start - a date object that defines the beginning of the range
    // end - a date object that defines the end of the range set as 55th or 60th brithday depending on age at exit.


function Reduce_service(start, end) {
    var years1 = DateDiffYears(start, end),
        tot_service = service_years_days(start, end),
        mydate = document.getElementById("calc-date-2").value,
        mydate2 = document.getElementById("calc-date-1").value;

    var day1 = (mydate.substring(0, 2)),
        month1 = (1*(mydate.substring(3, 5)))-1,
        year_start = (mydate.substring(6, 10)),
        day2 = (mydate2.substring(0, 2)),
        month2 = (1*(mydate2.substring(3, 5)))-1,
        year_end_ini = (mydate2.substring(6, 10));

    if (years1 < 50) {
        var year_end = 1 * year_end_ini;
    }
    else if (years1 >= 50 && years1 < 55) {
        var year_end = 1 * year_end_ini + 50;
    }
    else if (years1 >= 55 && years1 < 60) {
        var year_end = 1 * year_end_ini + 60;
    }
    else {
        var year_end = 1 * year_end_ini;
    };

    if (years1 >= 50 && years1 < 55) {
        var year_end = (mydate.substring(6, 10)),
            year_start = 1 * year_end_ini + 50,
            month2 = (1*(mydate.substring(3, 5)))-1,
            day2 = (mydate.substring(0, 2)),
            month1 = (1*(mydate2.substring(3, 5)))-1,
            day1 = (mydate2.substring(0, 2));
     };

    var one_day = 1000 * 60 * 60 * 24,
        myDate = new Date();

    if (month1 > month2) {
        myDate.setFullYear(year_end - 1, month1, day1);
    }
    else if (month1 < month2) {
        myDate.setFullYear(year_end, month1, day1);
    }
    else if (month1 == month2 && day1 < day2) {
        myDate.setFullYear(year_end, month1, day1);
    }
    else if (month1 == month2 && day1 > day2) {
        myDate.setFullYear(year_end - 1, month1, day1);
    }
    else {
        myDate.setFullYear(year_end, month1, day1);
    };

    var mystartdate = new Date();
    mystartdate.setFullYear(year_start, month1, day1);

    var myenddate = new Date();
    myenddate.setFullYear(year_end, month2, day2);

    var years = myDate.getFullYear() - mystartdate.getFullYear(),
        mynewstart = new Date();

    if (years1 >= 50 && years1 < 55) {
        mynewstart.setFullYear(myDate.getFullYear(), month1, 1 * day1 - 2);
    }
    else {
        mynewstart.setFullYear(myDate.getFullYear(), month1, 1 * day1 + 2);
    };

    var mynewend = new Date();
    mynewend.setFullYear(myenddate.getFullYear(), month2, day2);

    var No_ofdays = Math.ceil(mynewend.getTime() - mynewstart.getTime()) / (one_day),
        No_ofdays_leap = (1 * No_ofdays - 1),
        res = year_end % 4,
        reduce_factor = 0;

    if (res == 0 && month2 > 1) {
        reduce_factor = years + (No_ofdays_leap / 365);  //changed to 365 - leap year no longer relevant
    }
    else {
        reduce_factor = years + (No_ofdays / 365);
    };

    if (years1 < 50) {
        reduce_factor = 0;
    }

    var prospective = tot_service - reduce_factor;

    if (years1 >= 55 && years1 < 60) {
        prospective = reduce_factor;
    }

    var pros_total_service = new Number(prospective);

    return (pros_total_service.toFixed(5));
}



/*
    Calculator related functions
 */

function validateFormValues(el)
{
    var e = false;
    el.find('input').each(function() {
        if(!validateInputValue(this, false, $(this).attr('class')))
        {
            e = true;
            return false;
        }
    });
    return !e;
}

function validateInputValue(i,isBlur, c)
{
    //return true;
    console.log(i);
    
    if(typeof c == "undefined")
    {
        return true;
    }

    iJ = $(i);
    console.log(iJ);
    

    if(iJ.hasClass("datepicker") || iJ.hasClass("isdate"))
    {
        // validate for date
        if((!isBlur && i.value === ""))
        {
            console.log('Date field was empty');
            showError('Please enter a valid date (dd/mm/yyyy)','#'+i.id);
            return false;
        }

        if( typeof(iJ) === "string" && !isBlur && !iJ.match(/^[0-9][0-9]\/[0-9][0-9]\/[0-9][0-9][0-9][0-9]$/))
        {
            if(!iJ.hasClass('optional'))
            {
                console.log('Bad date value in date field');
                showError('Please enter a valid date (dd/mm/yyyy)','#' + iJ.attr('id') );
                return false;
            }
        }
        
    }
    else if(iJ.hasClass("numbers"))
    {
        
        if(isBlur)
        {
            var valCleaned = i.value.replace(/[^0-9]/g, '');
            i.value = valCleaned;
            console.log(i.value);
        }
        // make sure the input field only has numbers
        else if(i.value === "" || isNaN(i.value))
        {
            if(!iJ.hasClass('optional'))
            {
                console.log(i);
                console.log('Bad number in field' + i.id);
                showError('Please enter a valid number','#'+i.id);
                return false;
            }
        }
    }
    else if(iJ.hasClass("percentage"))
    {
        if(isBlur)
        {
            i.value = i.value.replace(/[^0-9\.]/g, '');
        }
        // make sure the input field only has numbers
        else if(i.value == "" || isNaN(i.value))
        {
            if(!iJ.hasClass('optional'))
            {
                showError('Please enter a valid percentage (e.g. 40.5)','#'+i.id);
                return false;
            }
        }
    }

    return true;
}

function showError(errorMsg, iSel)
{
    var i = $(iSel);

    if(document.getElementById('calc-error-msg'))
    {
        hideError();
    }

    if(i.length)
    {
        i.focus().select();

        var os = i.offset();

        var left = os.left + parseInt(i.css('width')) + 10,
            top = os.top - 5;

        //console.log(top + ' < top in px');
        setTimeout(function(){$('<div id="calc-error-msg">< '+errorMsg+'</div>')
            .css('top', top)
            .css('left', left)
            .insertAfter(document.body)
            .fadeIn('slow');}, 50);
    }
}

function hideError()
{
    $('#calc-error-msg').remove();
}












