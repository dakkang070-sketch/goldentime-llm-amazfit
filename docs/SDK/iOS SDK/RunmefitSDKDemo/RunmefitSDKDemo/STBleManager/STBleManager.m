//
//  STBleManager.m
//  RunmefitSDKDemo
//
//  Created by 星迈 on 2021/11/19.
//

#import "STBleManager.h"

#import "AppDelegate.h"

static STBleManager *manager = nil;

@interface STBleManager () <CBCentralManagerDelegate, CBPeripheralDelegate>

@end

@implementation STBleManager

+(instancetype)sharedInstance {
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        manager = [[STBleManager alloc]init];
    });
    return manager;
}

-(instancetype)init{
    if (self = [super init]) {
        NSDictionary *options = @{CBCentralManagerOptionShowPowerAlertKey:@(YES)};
        _centralManager = [[CBCentralManager alloc] initWithDelegate:self queue:dispatch_get_main_queue() options:options];
        _centralManager.delegate = self;
        _deviceModels = [[NSMutableArray alloc]init];
        _stateOn = NO;
    }
    return self;
}

#pragma mark - CBCentralManagerDelegate
-(void)centralManagerDidUpdateState:(CBCentralManager *)central{
    if (central.state == CBManagerStatePoweredOn) {
        _stateOn = YES;
    }else {
        _stateOn = NO;
    }
    if (self.updateState) {
        self.updateState(_stateOn);
    }
}

-(void)centralManager:(CBCentralManager *)central didDiscoverPeripheral:(CBPeripheral *)peripheral advertisementData:(NSDictionary<NSString *,id> *)advertisementData RSSI:(NSNumber *)RSSI{
    
    NSString *macStr = @"";
    NSString *manufacturerStr = @"";
    NSData *data = [advertisementData objectForKey:@"kCBAdvDataManufacturerData"];
    NSLog(@"peripheral.name=%@,kCBAdvDataManufacturerData=%@",peripheral.name,data);
    if (data.length >= 6) {///最后6位MAC地址
        Byte macBuf[6] = {0};
        if (data.length > 8) {///带数据广播地址
            [data getBytes:macBuf range:NSMakeRange(2,6)];
        }else {
            [data getBytes:macBuf range:NSMakeRange(data.length-6,6)];
        }
        NSMutableString *macAddress = [[NSMutableString alloc] init];
        for (int i = 0; i < 6; i++) {
            NSString *hexStr = [NSString stringWithFormat:@"%02x",(macBuf[i]) & 0xff];
            hexStr = [hexStr uppercaseString];
            if (i == 0) {
                [macAddress appendString:hexStr];
            }else {
                [macAddress appendString:[NSString stringWithFormat:@":%@",hexStr]];
            }
        }
        macStr = macAddress;
        
        Byte manufacturer[2] = {0};
        [data getBytes:manufacturer range:NSMakeRange(0,2)];
        manufacturerStr = [NSString stringWithFormat:@"<%02x%02x>",(manufacturer[0]) & 0xff,(manufacturer[1]) & 0xff];
    }
    if (![manufacturerStr isEqualToString:@"<0001>"]) {///生产商家
        return;
    }
    NSString *name = peripheral.name;
    ///name = [advertisementData objectForKey:@"kCBAdvDataLocalName"];
    ///name = [name stringByAppendingString:manufacturerStr];
    NSString *mac = macStr;
    if ([name hasSuffix:@"-0000"]) {///设备Mac异常
        return;
    }
    if (![self customContainsObject:name Mac:mac]) {
        STDeviceModel *deviceModel = [[STDeviceModel alloc]init];
        
        deviceModel.peripheral = peripheral;
        deviceModel.name = name;
        deviceModel.mac = mac;
        deviceModel.rssi = RSSI;
        [self.deviceModels addObject:deviceModel];
        
        if (self.updatePerpheral) {
            self.updatePerpheral(self.deviceModels);
        }
    }
}

//连接成功
-(void)centralManager:(CBCentralManager *)central didConnectPeripheral:(CBPeripheral *)peripheral{
    peripheral.delegate = self;

    for (STDeviceModel *deviceModel in self.deviceModels) {
        if ([deviceModel.peripheral isEqual:peripheral]) {
            self.actDeviceModel = deviceModel;
            break;
        }
    }
    
    [self stopScan];

    if (self.updateConnect) {
        self.updateConnect(YES);
    }
    
    [peripheral discoverServices:nil];
}

//异常断开
-(void)centralManager:(CBCentralManager *)central didFailToConnectPeripheral:(CBPeripheral *)peripheral error:(NSError *)error{
    if (error) {
        NSLog(@"error:%@",error);
    }
    if (self.updateConnect) {
        self.updateConnect(NO);
    }
}

//主动断开
-(void)centralManager:(CBCentralManager *)central didDisconnectPeripheral:(nonnull CBPeripheral *)peripheral error:(nullable NSError *)error{
    if (error) {
        NSLog(@"error:%@",error);
    }
    if (self.updateConnect) {
        self.updateConnect(NO);
    }
}

#pragma mark - CBPeripheralDelegate
-(void)peripheral:(CBPeripheral *)peripheral didDiscoverServices:(NSError *)error{
    if (error) {
        NSLog(@"error:%@",error);
    }else{
        for (CBService *service in peripheral.services) {
            [peripheral discoverCharacteristics:nil forService:service];
        }
    }
}

//读写特征值
-(void)peripheral:(CBPeripheral *)peripheral didDiscoverCharacteristicsForService:(CBService *)service error:(NSError *)error{
    if (error) {
        NSLog(@"error:%@",error);
    }else{
        NSString *uuidStr = service.UUID.UUIDString;
        if ([uuidStr isEqualToString:UUID_Service]) {
            for (CBCharacteristic *characteristic in service.characteristics) {
                NSString *uuidStr = characteristic.UUID.UUIDString;
                if ([uuidStr isEqualToString:UUID_Write_Char]) {
                    self.writeCharacter = characteristic;
                }
                if ([uuidStr isEqualToString:UUID_Notify_Char]) {
                    [peripheral setNotifyValue:YES forCharacteristic:characteristic];
                }
            }
        }
    }
}

-(void)peripheral:(CBPeripheral *)peripheral didWriteValueForCharacteristic:(CBCharacteristic *)characteristic error:(NSError *)error{
    if (error) {
        NSLog(@"error:%@",error);
    }else {
        //NSLog(@"发送:%@",characteristic.value);
    }
}

//回调
-(void)peripheral:(CBPeripheral *)peripheral didUpdateValueForCharacteristic:(CBCharacteristic *)characteristic error:(NSError *)error{
    NSLog(@"接收:%@",characteristic.value);
    if (error) {
        NSLog(@"error:%@",error);
    }else{
        [STBlueToothData.sharedInstance notifyRunmefit:peripheral WriteCharacter:self.writeCharacter Characteristic:characteristic Error:error Complete:^(NSError * _Nonnull error, REV_TYPE revType, ERROR_TYPE errorType, id  _Nonnull responseObject) {
            if (error) {
                NSLog(@"error:%@",error);
            }else{
                NSDictionary *dict = @{ST_RevType_Key:@(revType),
                                       ST_ErrorType_Key:@(errorType)};
                
                [[NSNotificationCenter defaultCenter] postNotificationName:Nof_Revice_Data_Key object:responseObject userInfo:dict];
            }
        }];
    }
}

#pragma mark - 扫描
-(void)startScan{
    if (self.stateOn) {
        [self prepareScan];
    }else{
        [AppDelegate.shareInstance alertShowTitle:@"提示" message:@"手机蓝牙未打开"];
        __weak typeof(self) weakSelf = self;
        [self setUpdateState:^(BOOL state) {
            if (state == YES) {
                [weakSelf prepareScan];
            }else{
                [AppDelegate.shareInstance alertShowTitle:@"提示" message:@"手机蓝牙未打开"];
            }
        }];
    }
}

//停止
-(void)stopScan{
    [self.centralManager stopScan];
}

//连接
-(void)connectPerpheral:(STDeviceModel *)deviceModel{
    if (deviceModel && self.stateOn) {
        [self.centralManager connectPeripheral:deviceModel.peripheral options:nil];
    }
}

//取消
-(void)cancelPeripheral:(STDeviceModel *)deviceModel{
    if (deviceModel && self.stateOn) {
        [self.centralManager cancelPeripheralConnection:deviceModel.peripheral];
    }
}

//发送
-(void)writeCommand:(NSData *)data{
    if (self.writeCharacter && data.length > 0) {
        [self.actDeviceModel.peripheral writeValue:data forCharacteristic:self.writeCharacter type:CBCharacteristicWriteWithResponse];
        ///[self.actDeviceModel.peripheral writeValue:data forCharacteristic:self.writeCharacter type:CBCharacteristicWriteWithoutResponse];
    }else {
        [AppDelegate.shareInstance alertShowTitle:@"提示" message:@"设备未连接"];
    }
}

#pragma mark - 准备扫描
-(void)prepareScan{
    [self.deviceModels removeAllObjects];
    
    NSArray *uuidArr = @[[CBUUID UUIDWithString:UUID_Service]];
    NSArray *peripherals = [self.centralManager retrieveConnectedPeripheralsWithServices:uuidArr];
    for (CBPeripheral *peripheral in peripherals) {

        NSString *name = peripheral.name;
        NSString *mac = @"已连接";
        if (![self customContainsObject:name Mac:mac]) {

            STDeviceModel *deviceModel = [[STDeviceModel alloc]init];
            deviceModel.peripheral = peripheral;
            deviceModel.name = name;
            deviceModel.mac = mac;
            deviceModel.rssi = @0;
            [self.deviceModels addObject:deviceModel];
        }
    }
    
    if (self.updatePerpheral) {
        self.updatePerpheral(self.deviceModels);
    }
    
    [self.centralManager scanForPeripheralsWithServices:nil options:nil];
}

//判断是否新增设备
-(BOOL)customContainsObject:(NSString *)name Mac:(NSString *)mac{
    
    NSArray *names = [self.deviceModels valueForKeyPath:@"name"];
    NSArray *macs = [self.deviceModels valueForKeyPath:@"mac"];

    if ([macs containsObject:mac]) {
        return YES;
    }
    if ([names containsObject:name]) {
        return YES;
    }
    return NO;
}

@end
