import * as React from 'react';
import { Alert, AlertGroup, AlertActionCloseButton, AlertVariant, InputGroup } from '@patternfly/react-core';

export interface ToastData{
    title:any,
    variant:any,
    key:any
}
export default class ToastAlertGroup extends React.Component {

    alerts:Array<ToastData> 

    constructor(props) {
        super(props)
        this.alerts = []     
    }

    addAlert({title,variant,key}){
        let alert = {title,variant,key}
        console.log(alert)
        this.alerts = [...this.alerts,alert]
    }

    removeAlert(key){
        console.log(key)
        this.alerts = this.alerts.filter(el => el.key !== key)
        this.setState({})
    }

    render(){
       return  <React.Fragment>
                    <AlertGroup isToast>
                    {this.alerts.map((data:ToastData) => (
                        <Alert
                        isLiveRegion
                        variant={AlertVariant[data.variant]}
                        title={data.title}
                        action={
                            <AlertActionCloseButton
                            title={data.title}
                            variantLabel={`${data.variant} alert`}
                            onClose={() => this.removeAlert(data.key)}
                            />
                        }
                        key={data.key} />
                    ))}
                    </AlertGroup>
                </React.Fragment>    
    }


}