
import DOM from './dom';
import Contract from './contract';
import Config from './config.json';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        contract.getPassengers(passengers => {
            for (let passenger in passengers) {
                DOM.elid('users-list').appendChild(DOM.option({value: passengers[passenger]}, passengers[passenger]))
            }
        })

        contract.getFlights((result, index) => {
            const flights = Config["flights"]
            DOM.elid('flights-list').appendChild(DOM.option({
                value: flights[index].ref
            }, `${flights[index].ref} - ${flights[index].departure}`))
        })

        contract.initEvents((error, event) => {
            DOM.elid("Update")?.remove()
            const statusCode = status => {
                switch(parseInt(status)) {
                    case 0: return 'Unknown';
                    case 10: return 'On Time';
                    case 20: return 'Late Airline';
                    case 30: return 'Late Weather';
                    case 40: return 'Late Technical';
                    case 50: return 'Late Other';
                    default: return "Error"
                }
            }
            display('Update', 'Fly Info', [ { 
                label: 'Flight Status Fetched', 
                error: error, 
                value: `Flight number ${event.returnValues.flight}` + ' with the status code : ' + statusCode(event.returnValues.status)} 
            ]);
        })
        
        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flights-list').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        DOM.elid('subscribe-insurance').addEventListener('click', () => {
            const passenger = DOM.elid('users-list').value;
            const flight = DOM.elid('flights-list').value;
            const amount = DOM.elid('amount').value;
            // Write transaction
            contract.subscribeInsurance(passenger, flight, amount, (error, result) => {
                display('Subscribe', 'New Subscription', [ { label: 'Result of suscription', error: error, value: error ? "error" : "Done"} ]);
            });
        })
    
    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section({id: title});
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







