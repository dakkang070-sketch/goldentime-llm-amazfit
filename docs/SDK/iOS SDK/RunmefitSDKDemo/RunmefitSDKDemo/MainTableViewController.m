//
//  MainTableViewController.m
//  RunmefitSDKDemo
//
//  Created by 星迈 on 2021/11/22.
//

#import "MainTableViewController.h"
#import "MainTableViewController+Help.h"

@interface MainTableViewController ()<UITableViewDelegate,UITableViewDataSource>

@property(nonatomic,strong) NSArray *funcArr;

@property (nonatomic,strong) NSMutableString *logStr;
@property (nonatomic,strong) UITextView *textView;

@end

@implementation MainTableViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    
    UIButton*button = [[UIButton alloc]initWithFrame:CGRectMake(0,0,44,44)];
    [button setTitle:TRLocalizedString(@"搜索", nil) forState:UIControlStateNormal];
    [button setTitleColor:[UIColor blackColor] forState:UIControlStateNormal];
    [button addTarget:self action:@selector(scanPerperals) forControlEvents:UIControlEventTouchUpInside];
    self.navigationItem.rightBarButtonItem = [[UIBarButtonItem alloc] initWithCustomView:button];
    
    self.logStr = [[NSMutableString alloc] init];
    
    UIButton*clearBtn = [[UIButton alloc]initWithFrame:CGRectMake(0,0,44,44)];
    [clearBtn setTitle:TRLocalizedString(@"清除", nil) forState:UIControlStateNormal];
    [clearBtn setTitleColor:[UIColor blackColor] forState:UIControlStateNormal];
    [clearBtn addTarget:self action:@selector(clearLog) forControlEvents:UIControlEventTouchUpInside];
    self.navigationItem.leftBarButtonItem = [[UIBarButtonItem alloc] initWithCustomView:clearBtn];
    
    self.funcArr = [self readFuncArr];
    
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(nofReviceData:) name:Nof_Revice_Data_Key object:nil];
}

-(void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    [[UIApplication sharedApplication] setIdleTimerDisabled:YES];///禁止黑屏

    __weak typeof(self) weakSelf = self;
    [self showConnectState];
    [STBleManager.sharedInstance setUpdateState:^(BOOL state) {
        [weakSelf showConnectState];
    }];
    [STBleManager.sharedInstance setUpdateConnect:^(BOOL connect) {
        [weakSelf showConnectState];
    }];
}

- (void)viewWillDisappear:(BOOL)animated {
    [super viewWillDisappear:animated];
    [[UIApplication sharedApplication] setIdleTimerDisabled:NO];///默认黑屏
}

//状态
- (void)showConnectState {
    STDeviceModel *actDeviceModel = STBleManager.sharedInstance.actDeviceModel;
    if (actDeviceModel) {
        if (actDeviceModel.peripheral.state == CBPeripheralStateConnected) {
            self.title = [NSString stringWithFormat:@"%@%@",actDeviceModel.name,TRLocalizedString(@"已连接", nil)];
        }else{
            self.title = [NSString stringWithFormat:@"%@%@",actDeviceModel.name,TRLocalizedString(@"已断开", nil)];
            [self hideHUD];
        }
        
    }else{
        self.title = TRLocalizedString(@"设备未连接", nil);
    }
}

- (void)clearLog {
    [self.logStr setString:@""];
    self.textView.text = self.logStr;
}

- (void)addLog:(NSString *)str {
    [self.logStr appendString:str];
    [self.logStr appendString:@"\n"];
    self.textView.text = self.logStr;
    [self.textView scrollRangeToVisible:NSMakeRange(self.textView.text.length, 1)];
}

- (void)scanPerperals {
    PerperalsTableViewController *perpheralVC = [[PerperalsTableViewController alloc] init];
    [self.navigationController pushViewController:perpheralVC animated:YES];
}

#pragma mark - Table view data source

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    return self.funcArr.count;
}

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {
    static NSString *reusedId = @"reuseIdentifier";
    UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:reusedId];
    if (!cell) {
        cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleDefault reuseIdentifier:reusedId];
    }
    
    NSDictionary *dict = self.funcArr[indexPath.row];
    NSNumber *cell_id_num = dict[cell_id];
    NSString *cell_title_str = dict[cell_title];
    
    cell.textLabel.text = [NSString stringWithFormat:@"%@-%@",cell_id_num,cell_title_str];
    return cell;
}

- (UIView *)tableView:(UITableView *)tableView viewForHeaderInSection:(NSInteger)section {
    
    UITextView *textView = [[UITextView alloc] initWithFrame:CGRectMake(0,0,self.view.bounds.size.width, 200)];
    textView.textColor = [UIColor blackColor];
    textView.textAlignment = NSTextAlignmentLeft;
    textView.font = [UIFont systemFontOfSize:14];
    textView.layer.borderWidth = 1;
    textView.layer.borderColor = [UIColor blackColor].CGColor;
    textView.editable = NO;
    textView.layoutManager.allowsNonContiguousLayout = YES;
    self.textView = textView;
    
    return textView;
}

- (CGFloat) tableView:(UITableView *)tableView heightForHeaderInSection:(NSInteger)section {
    return 200;
}

#pragma mark - Table view delegate
-(void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath {
    
    NSDictionary *dict = self.funcArr[indexPath.row];
    NSNumber *cell_id_num = dict[cell_id];
    NSString *cell_title_str = dict[cell_title];
    
    NSString *text = cell_title_str;
    [self addLog:[NSString stringWithFormat:@"%@",text]];
   
    //MARK: 蓝牙接口
    STDeviceModel *actDeviceModel = STBleManager.sharedInstance.actDeviceModel;
    if (!actDeviceModel || actDeviceModel.peripheral.state != CBPeripheralStateConnected) {
        [self showHUDText:@"设备未连接"];
        return;
    }

    NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
    [formatter setDateFormat:@"yyyyMMdd"];
    NSString *dateStr = [formatter stringFromDate:NSDate.date];
    
    NSData *data = nil;
    switch (cell_id_num.intValue) {
            
        //MARK: 》数据传输
            
        case 0://绑定设备
            data = [STBlueToothSender writeDeviceBind];
            break;
        case 1://设备状态(获取)
            data = [STBlueToothSender readDeviceState];
            break;
        case 2://设备状态(设置)
        {
            STDeviceState *model = STDeviceState.new;
            
            model.timeMode = STlTimeModeHour24;///时间制式:24小时
            model.unit = STUnitMetric;///单位:公制
            model.temperatureUnit = STlTemperatureUnitCelsius;///温度单位:摄氏
            model.language = STlLanguageChinese;///语言:中文
            model.brightDuration = 10;///亮屏时长:10分钟
            model.brightness = 5;///屏幕亮度:5
            model.trunWrist = 1;///翻腕亮屏:开
            
            data = [STBlueToothSender writeDeviceState:model];
        }
            break;
        case 3://查找设备
            data = [STBlueToothSender writeFindDevice];///writeEndFindDevice
            break;
        case 4://拍照控制
            data = [STBlueToothSender writePhotoContrl:STlPhotoContrlStart];
            break;
        case 5://获取电池电量
            data = [STBlueToothSender readDeviceBattery];
            break;
        case 75://获取设备ANCS
            data = [STBlueToothSender readDeviceANCS];
            break;
        case 6://获取设备版本信息
            data = [STBlueToothSender readDeviceVersion];
            break;
        case 7://时间时区(获取)
            data = [STBlueToothSender readDeviceDateTime];
            break;
        case 8://时间时区(设置)
            data = [STBlueToothSender writeDeviceDateTime];
            break;
        case 9://用户信息(获取)
            data = [STBlueToothSender readUserInfo];
            break;
        case 10://用户信息(设置)
        {
            STlUserInfo *model = STlUserInfo.new;
            model.sex = 0;
            model.age = 20;
            model.height = 170;
            model.weight = 600;
            data = [STBlueToothSender writeUserInfo:model];
        }
            break;
        case 11://一天运动目标(获取)
            data = [STBlueToothSender readSportGoal];
            break;
        case 12://一天运动目标(设置)
        {
            STlSportGoal *model = STlSportGoal.new;
            model.step = 5000;
            model.calories = 250;
            model.distance = 5;
            data = [STBlueToothSender writeSportGoal:model];
        }
            break;
        case 13://蓝牙系统配对
            data = [STBlueToothSender writeDevicePair];
            break;
        case 14://消息推送开关(获取)
            data = [STBlueToothSender readMessageNotice];
            break;
        case 15://消息推送开关(设置)
        {
            STMessageNotice *model = STMessageNotice.new;
            model.isAll = YES;//NO;
            
            model.isIncoming = YES;
            model.isSms = YES;
            model.isEmail = YES;
            model.isTwitter = YES;
            model.isFacebook = YES;
            model.isWhatsapp = YES;
            model.isLine = YES;
            model.isSkype = YES;
            model.isQq = YES;//NO;
            model.isWechat = YES;
            model.isInstagram = YES;
            model.isLinkedin = YES;
            model.isMessager = YES;
            model.isVk = YES;
            model.isViber = YES;
            model.isTelegram = YES;
            model.isKakaoTalk = YES;
            model.isOther = NO;//YES;
            
            data = [STBlueToothSender writeMessageNotice:model];
        }
            break;
        case 16://获取当前设备展示数据
            data = [STBlueToothSender readCurrentHealth];
            break;
        case 17://健康数据检测开关(获取)
            data = [STBlueToothSender readHealthSwitch];
            break;
        case 18://健康数据检测开关(设置)
        {
            STHealthSwitch *model = STHealthSwitch.new;
            model.isHR = YES;
            model.isBP = YES;
            model.isBO = YES;
            model.isPP = YES;
            model.isTP = YES;
            model.isBS = YES;
            data = [STBlueToothSender writeHealthSwitch:model];
        }
            break;
        case 19://恢复出厂设置
            data = [STBlueToothSender writeFactorySetting];
            break;
            
            
        case 20://心率检测间隔(获取)
            data = [STBlueToothSender readConfigMeasureHR];
            break;
        case 21://心率检测间隔(设置)
        {
            STConfigMeasureHR *model = STConfigMeasureHR.new;
            
            STIntervalTime *intervalTime = STIntervalTime.new;
            intervalTime.startHour = 9;
            intervalTime.startMins = 30;
            intervalTime.endHour = 21;
            intervalTime.endMins = 30;
            
            model.intervalTime = intervalTime;
            model.interval = 15;
            model.thresholdHR = 200;
            data = [STBlueToothSender writeConfigMeasureHR:model];
        }
            break;
        case 22://常用联系人(获取)
            data = [STBlueToothSender readCommonContacts];
            break;
        case 23://常用联系人(设置)
        {
            NSMutableArray<STContacts *>*modelArr = NSMutableArray.new;
            for (int i = 0; i < 3; i++) {
                STContacts *model = STContacts.new;
                ///model.isSOS = NO;
                model.name = [NSString stringWithFormat:@"张_name_%d",i];
                model.phone = [NSString stringWithFormat:@"1522012762%d",i];
                [modelArr addObject:model];
            }
            data = [STBlueToothSender writeCommonContacts:modelArr];
        }
            break;
        case 24://紧急联系人(获取)
            data = [STBlueToothSender readSosContacts];
            break;
        case 25://紧急联系人(设置)
        {
            NSMutableArray<STContacts *>*modelArr = NSMutableArray.new;
            for (int i = 0; i < 0; i++) {///3
                STContacts *model = STContacts.new;
                ///model.isSOS = YES;
                model.name = [NSString stringWithFormat:@"SOS_name_%d",i];
                model.phone = [NSString stringWithFormat:@"1522012762%d",i];
                [modelArr addObject:model];
            }
            data = [STBlueToothSender writeSosContacts:modelArr];
        }
            break;
        case 26://勿扰(获取)
            data = [STBlueToothSender readNoDisturb];
            break;
        case 27://勿扰(设置)
        {
            STNoDisturb *model = STNoDisturb.new;
            
            STIntervalTime *intervalTime = STIntervalTime.new;
            intervalTime.startHour = 9;
            intervalTime.startMins = 30;
            intervalTime.endHour = 21;
            intervalTime.endMins = 30;
            
            model.intervalTime = intervalTime;
            model.isOpen = YES;
            model.isAllDay = NO;
            data = [STBlueToothSender writeNoDisturb:model];
        }
            break;
        case 28://闹钟(获取)
            data = [STBlueToothSender readAlarmClocks];
            break;
        case 29://闹钟(设置)
        {
            NSMutableArray<STAlarmClock *>*modelArr = NSMutableArray.new;
            for (int i = 0; i < 0; i++) {///3
                STAlarmClock *model = STAlarmClock.new;
                model.isOpen = i%2;
                model.hour = 9+i;
                model.minute = 30;
                model.type = STAlarmClockTypeDefault;
                model.cycle = @[@(1),@(1),@(1),@(1),@(1),@(1),@(1)];
                [modelArr addObject:model];
            }
            data = [STBlueToothSender writeAlarmClocks:modelArr];
        }
            break;
        case 30://久坐提醒(获取)
            data = [STBlueToothSender readSedentaryAlarmInterval];
            break;
        case 31://久坐提醒(设置)
        {
            STAlarmInterval *model = STAlarmInterval.new;
            
            STIntervalTime *intervalTime = STIntervalTime.new;
            intervalTime.startHour = 9;
            intervalTime.startMins = 30;
            intervalTime.endHour = 21;
            intervalTime.endMins = 30;
            
            model.intervalTime = intervalTime;
            model.isOpen = YES;
            model.interval = 15;
            data = [STBlueToothSender writeSedentaryAlarmInterval:model];
        }
            break;
        case 32://喝水提醒(获取)
            data = [STBlueToothSender readDrinkWaterAlarmInterval];
            break;
        case 33://喝水提醒(设置)
        {
            STAlarmInterval *model = STAlarmInterval.new;
            
            STIntervalTime *intervalTime = STIntervalTime.new;
            intervalTime.startHour = 9;
            intervalTime.startMins = 30;
            intervalTime.endHour = 21;
            intervalTime.endMins = 30;
            
            model.intervalTime = intervalTime;
            model.isOpen = YES;
            model.interval = 15;
            data = [STBlueToothSender writeDrinkWaterAlarmInterval:model];
        }
            break;
        case 34://推送天气
        {
            NSMutableArray<STWeather *>*modelArr = NSMutableArray.new;
            for (int i = 0; i < 4; i++) {
                STWeather *model = STWeather.new;
                model.temp = @"-31";//@"31";
                model.tempMin = @"-20";//@"26";
                model.tempMax = @"40";//@"32";
                model.conditionCode = [self stmWeatherCodeTransform:200];
                model.unit = 0;
                model.windSpeed = @"1";
                model.humidity = @"2";
                model.vis = @"30";
                model.uvIndex = @"4";
                model.AQI = @"1";
                
                [modelArr addObject:model];
            }
            data = [STBlueToothSender writeWeather:modelArr];
        }
            break;
        case 35://事件提醒(获取)
            data = [STBlueToothSender readAlarmEvens];
            break;
        case 36://事件提醒(设置)
        {
            NSMutableArray<STAlarmEvent *>*modelArr = NSMutableArray.new;
            for (int i = 0; i < 15; i++) {///15
                STAlarmEvent *model = STAlarmEvent.new;
                
                model.year = 2022;
                model.month = 12;
                model.day = 8;
                model.hour = 11;
                model.minute = 30;
                
                ///model.type = STEventTypeImportance;
                model.type = 1+i%4;

                model.content = @"提醒内容（Unicode编码，n最大254字节-127个字符）,提醒内容（Unicode编码，n最大254字节-127个字符）";
                model.contentLen = model.content.length;
                
                model.cycleType = 1+i%4;
                model.cycle = @[@(1),@(0),@(1),@(1),@(0),@(1),@(1)];

                [modelArr addObject:model];
            }
            if (self.blockReadInterval <= 0) {
                ///self.blockReadInterval = 4104;
                [self showHUDText:@"请先获取固件版本信息"];
                return;
            }
            CBPeripheral *peripheral = STBleManager.sharedInstance.actDeviceModel.peripheral;
            CBCharacteristic *characteristic = STBleManager.sharedInstance.writeCharacter;
            [STBlueToothData.sharedInstance writeAlarmEvens:modelArr BlockReadInterval:self.blockReadInterval Peripheral:peripheral Characteristic:characteristic];
            
            return;
        }
            break;
            
            
        //MARK: 》大数据传输

        case 37://同步运动
            data = [STBlueToothSender readSportModeHistory:0];
            break;
        case 38://同步记步/睡眠
            data = [STBlueToothSender readStepAndSleepHistoryWithDate:dateStr];
            break;
        case 39://同步心率
            data = [STBlueToothSender readHeartRateHistoryWithDate:dateStr];
            break;
        case 40://同步血压
            data = [STBlueToothSender readBloodPressureHistoryWithDate:dateStr];
            break;
        case 41://同步血氧
            data = [STBlueToothSender readBloodOxygenHistoryWithDate:dateStr];
            break;
        case 42://同步压力
            data = [STBlueToothSender readPhysicalPressureHistoryWithDate:dateStr];
            break;
        case 43://同步梅脱
            data = [STBlueToothSender readMetsHistoryWithDate:dateStr];
            break;
        case 44://同步温度
            data = [STBlueToothSender readTemperatureHistoryWithDate:dateStr];
          
            break;
        case 45://同步Mai
            data = [STBlueToothSender readMaiHistoryWithDate:dateStr];
            break;
        case 46://获取数据有效日期列表
            data = [STBlueToothSender readHistoryValidDate:ST_History_Sugar];
            break;
            
            
        //MARK: 》文件传输
            
        case 47://文件传输(表盘)
        {
            //NSLog(@"防止误点击");return;
            
            //NSString *path = [[NSBundle mainBundle] pathForResource:@"extern_dial_src" ofType:@"bin"];
            //NSString *path = [[NSBundle mainBundle] pathForResource:@"Crisscross" ofType:@"bin"];
            NSString *path = [[NSBundle mainBundle] pathForResource:@"image_logo1" ofType:@"bin"];
            NSMutableData *data = [[NSMutableData alloc]initWithData:[NSData dataWithContentsOfFile:path]];///获取工程内文件的路径

            int typeId = 4;///文件类型（1为表盘, 2为ui, 3为多语言, 4为开机logo）
            int dialId = 0;
            
            if (typeId == 1) {///1为表盘
                dialId = 25001;//20000;
                /**
                 1<= id <= 5000 为本地表盘，
                 5001 <=id <= 25000 为自定义表盘
                 25001 <= id <= 65535 为表盘市场
                 */
                if (dialId >= 5001 && dialId <= 25000) {
                    UIImage *bgImage = [UIImage imageNamed:@"big_numbers.png"];
                    NSData *bmpData = [STBlueToothSender getRGB656DataWith:bgImage];
                    [data appendData:bmpData];///自定义背景图
                }
            }
            
            if (typeId == 4) {///4为开机logo
                /**
                UIImage *bgImage = [UIImage imageNamed:@"logo.png"];
                NSData *bmpData = [STBlueToothSender getRGB656DataWith:bgImage];
                [data resetBytesInRange:NSMakeRange(0, data.length)];
                [data setLength:0];///复位清空
                [data appendData:bmpData];///自定义开机logo
                */
            }
            
            NSMutableData *info = NSMutableData.new;
            Byte type[] = {typeId};
            [info appendData:[STMath byteToData:type Len:1]];///(1B)文件类型（1为表盘, 2为ui, 3为多语言, 4为开机logo）
            [info appendData:[STMath intToBytes:(int)data.length]];///(4B)文件数据总长度（有效数据）
            [info appendData:[STMath shortToBytes:dialId]];///(2B): 表盘id

            int r = 0;
            int g = 255;
            int b = 0;
            /**
            //RGB888转RGB565数组
            uint16_t B = (b >> 3) & 0x001F;
            uint16_t G = ((g >> 2) << 5) & 0x07E0;
            uint16_t R = ((r >> 3) << 11) & 0xF800;

            uint16_t RGB565pixel = (R | G | B);

            Byte pByte[2] = {};
            pByte[0] = (Byte)((RGB565pixel>>8) & 0xFF);
            pByte[1] = (Byte)(RGB565pixel & 0xFF);
            NSData *rgb565 = [STMath byteToData:pByte Len:2];
            */
            [info appendData:[STBlueToothSender getRGB656DataWithR:r G:g B:b]];///(2B): 颜色值（rgb565）

            Byte mode[] = {1};
            [info appendData:[STMath byteToData:mode Len:1]];///(1B): 位置 1：上  2：中  3：下

            if (self.blockReadInterval <= 0) {
                ///self.blockReadInterval = 4104;
                [self showHUDText:@"请先获取固件版本信息"];
                return;
            }
            [self writeBinFileInfo:info Data:data BlockReadInterval:self.blockReadInterval];

            return;
            
        }
            break;
        case 48://获取表盘信息
            data = [STBlueToothSender readDeviceDialInfo];
            break;
        case 49://切换当前显示表盘
            data = [STBlueToothSender writeCurrentDeviceDial:20000];
            break;
        case 50://文件传输(UI)
        {
            /*
            //NSString *path = [[NSBundle mainBundle] pathForResource:@"XM_X03M01T01_V01.03.13T_202401030838_DIFF" ofType:@"bin"];
            //NSString *path = [[NSBundle mainBundle] pathForResource:@"XM_X03M01T01_V01.03.14T_202401031925_DIFF" ofType:@"bin"];
                        
            NSString *path = [[NSBundle mainBundle] pathForResource:@"XM_X03M30T004_V01.02.81_202407151125_DIFF_dev" ofType:@"bin"];
            //NSString *path = [[NSBundle mainBundle] pathForResource:@"XM_X03M30T004_V01.02.80_202407151122_DIFF_dev" ofType:@"bin"];
            
            NSMutableData *data = [[NSMutableData alloc]initWithData:[NSData dataWithContentsOfFile:path]];///获取工程内文件的路径
            
            if (self.blockReadInterval <= 0) {
                ///self.blockReadInterval = 4104;
                ///[self showHUDText:@"请先获取固件版本信息"];
                ///return;
            }
            
            [self writeBinFileDiffData:data BlockReadInterval:self.blockReadInterval];
            */
            
            NSLog(@"防止误点击");
            return;

//            NSString *path = [[NSBundle mainBundle] pathForResource:@"image_out" ofType:@"bin"];
//            NSMutableData *data = [[NSMutableData alloc]initWithData:[NSData dataWithContentsOfFile:path]];///获取工程内文件的路径
//
//            NSMutableData *info = NSMutableData.new;
//            Byte type[] = {2};
//            [info appendData:[STMath byteToData:type Len:1]];///(1B)文件类型（1为表盘, 2为ui, 3为多语言）
//            [info appendData:[STMath intToBytes:(int)data.length]];///(4B)文件数据总长度（有效数据）
//
//            if (self.blockReadInterval <= 0) {
//                ///self.blockReadInterval = 4104;
//                [self showHUDText:@"请先获取固件版本信息"];
//                return;
//            }
//            [self writeBinFileInfo:info Data:data BlockReadInterval:self.blockReadInterval];
//
//            return;
            
        }
            break;
        case 51://文件传输(语言)
        {
            /*
            //NSString *path = [[NSBundle mainBundle] pathForResource:@"XM_X03M01T01_V01.03.13T_202401030838_DIFF" ofType:@"bin"];
            NSString *path = [[NSBundle mainBundle] pathForResource:@"XM_X03M01T01_V01.03.14T_202401031925_DIFF" ofType:@"bin"];
            NSMutableData *data = [[NSMutableData alloc]initWithData:[NSData dataWithContentsOfFile:path]];///获取工程内文件的路径
            
            if (self.blockReadInterval <= 0) {
                ///self.blockReadInterval = 4104;
                ///[self showHUDText:@"请先获取固件版本信息"];
                ///return;
            }
            
            [self writeBinFileDiffData:data BlockReadInterval:self.blockReadInterval];
            */
            
            NSLog(@"防止误点击");
            return;
            
//            NSString *path = [[NSBundle mainBundle] pathForResource:@"image_out" ofType:@"bin"];
//            NSMutableData *data = [[NSMutableData alloc]initWithData:[NSData dataWithContentsOfFile:path]];///获取工程内文件的路径
//
//            NSMutableData *info = NSMutableData.new;
//            Byte type[] = {3};
//            [info appendData:[STMath byteToData:type Len:1]];///(1B)文件类型（1为表盘, 2为ui, 3为多语言）
//            [info appendData:[STMath intToBytes:(int)data.length]];///(4B)文件数据总长度（有效数据）
//
//            Byte lang[] = {1};
//            [info appendData:[STMath byteToData:lang Len:1]];///(1B)语言id
//
//            NSString *version = @"1.0.1";
//            NSData *versionData = [version dataUsingEncoding:NSUTF8StringEncoding];
//            NSUInteger versionLen = versionData.length;
//            if (versionLen > 4) {
//                versionLen = 4;
//            }
//            Byte newVersionByte[] = {0x00,0x00,0x00,0x00};
//            Byte *versionByte = [STMath dataToByte:versionData];
//            for (int i = 0; i < versionLen; i++) {
//                newVersionByte[i] = versionByte[i];
//            }
//            [info appendData:[STMath byteToData:newVersionByte Len:4]];///(4B)语言bin版本号
//
//            if (self.blockReadInterval <= 0) {
//                ///self.blockReadInterval = 4104;
//                [self showHUDText:@"请先获取固件版本信息"];
//                return;
//            }
//            [self writeBinFileInfo:info Data:data BlockReadInterval:self.blockReadInterval];
//
//            return;
            
//            NSString *path = [[NSBundle mainBundle] pathForResource:@"bk3633_app_ota" ofType:@"bin"];
//            NSMutableData *data = [[NSMutableData alloc]initWithData:[NSData dataWithContentsOfFile:path]];///获取工程内文件的路径
//
//            NSMutableData *info = NSMutableData.new;
//            Byte type[] = {3};
//            [info appendData:[STMath byteToData:type Len:1]];///(1B)文件类型（—>1为表盘, 2为ui, 3固件）
//            [info appendData:[STMath intToBytes:(int)data.length]];///(4B)文件数据总长度（有效数据）
//
//            if (self.blockReadInterval <= 0) {
//                ///self.blockReadInterval = 4104;
//                [self showHUDText:@"请先获取固件版本信息"];
//                return;
//            }
//            [self writeBinFileInfo:info Data:data BlockReadInterval:self.blockReadInterval];
//
//            return;
              
        }
            break;
            
            
            //MARK: 》实时数据

        case 52://实时数据开关(获取)
            data = [STBlueToothSender readRealTimeSwitchs];
            break;
        case 53://实时数据开关(设置)
        {
            STRealTimeSwitchs *model = STRealTimeSwitchs.alloc.init;
            
            model.gsensor = NO;
            model.sdc = YES;
            model.hr = YES;
            model.bp = YES;
            model.bq = YES;
            model.tp = YES;
            model.bs = YES;
            
            data = [STBlueToothSender writeRealTimeSwitchs:model];
        }
            break;
        case 54://同步血糖(获取)
            data = [STBlueToothSender readSugarHistoryWithDate:dateStr];
            break;
        case 55://运动模式配置(获取)
            data = [STBlueToothSender readSportConfig];
            break;
        case 56://运动模式配置(设置)
        {
            STSportConfig *sportConfig = [STSportConfig new];
            
            sportConfig.walk = YES;
            sportConfig.run = YES;
            sportConfig.ride = YES;
            sportConfig.indoorRun = YES;
            
            sportConfig.freeTrain = NO;
            sportConfig.football = NO;
            sportConfig.basketball = NO;
            sportConfig.badminton = NO;
            sportConfig.ropeSkip = NO;
            sportConfig.climb = NO;
            sportConfig.happyBike = NO;
            sportConfig.yoga = NO;
            sportConfig.onFoot = NO;
            sportConfig.fastWalking = NO;
            sportConfig.ellipticalMachine = NO;
            sportConfig.strengthTraining = NO;
            
            data = [STBlueToothSender writeSportConfig:sportConfig];
        }
            break;
        case 57://自定义推送消息(设置)
            data = [STBlueToothSender writePushMessageTitle:@"测试" Message:@"自定义推送消息(设置)HuangQi"];
            break;
        case 62://单独时区(获取)
            data = [STBlueToothSender readDeviceEra];
            break;
        case 63://单独时区(设置)
            data = [STBlueToothSender writeDeviceEra];
            break;
        case 64://世界时钟(获取)
            data = [STBlueToothSender readDeviceWorldClock];
            break;
        case 65://世界时钟(设置)
        {
            NSArray *worldClockArr = @[@1,@2];
            data = [STBlueToothSender writeDeviceWorldClock:worldClockArr];
        }
            break;
        case 66://推送应用(获取)
            data = [STBlueToothSender readDeviceFunId];
            break;
        case 67://推送应用(设置)
        {
            NSArray *funIdArr = @[@1,@2];
            data = [STBlueToothSender writeDeviceFunId:funIdArr];
        }
            break;
        case 68://脱腕密码(获取)
            data = [STBlueToothSender readDeviceWristCode];
            break;
        case 69://脱腕密码(设置)
        {
            NSString *codeString = @"12345";
            data = [STBlueToothSender writeDeviceWristCode:codeString On:NO];//YES];
        }
            break;
        case 70://女性健康(获取)
            data = [STBlueToothSender readDeviceWomenHealth];
            break;
        case 71://女性健康(设置)
        {
            NSString *lastDateStr = @"20231124";
            data = [STBlueToothSender writeDeviceWomenHealth:6 Cycle:30 LastDate:lastDateStr];
        }
            break;
        case 72://推送天气(7天)
        {
            NSMutableArray<STWeather *>*modelArr = NSMutableArray.new;
            for (int i = 0; i < 8; i++) {
                STWeather *model = STWeather.new;
                model.temp = @"-31";
                model.tempMin = @"-26";
                model.tempMax = @"32";
                model.conditionCode = [self stmWeatherCodeTransform:150];
                model.unit = 0;
                model.windSpeed = @"1";
                model.humidity = @"2";
                model.vis = @"30";
                model.uvIndex = @"4";
                model.AQI = @"1";

                model.sunrise = @"15:21";
                model.sunset = @"04:20";
                model.moonrise = @"15:21";
                model.moonset = @"04:20";

                [modelArr addObject:model];
            }
            data = [STBlueToothSender writeWeatherCity:@"香港" ModelArr:modelArr];
        }
            break;
        case 73://健康测量指令
        {
            Byte Id = 0x66;
            data = [STBlueToothSender writeDeviceHealthMeasure:Id On:YES];
        }
            break;
        case 74://同步新睡眠
            /**
             1开始入睡2浅睡3深睡4清醒   5 快速眼动
             129 开始入睡（小睡）   130浅睡（小睡）  131深睡（小睡）   132清醒 （小睡）   133 快速眼动（小睡）
             */
            data = [STBlueToothSender readNewSleepHistoryWithDate:dateStr];
            break;
       
        default:
            break;
    }
    if (data) {
        [STBleManager.sharedInstance writeCommand:data];
        return;
    }

    //MARK: 网络接口
        
    if (!self.version || !self.uiVersion || !self.nameModel) {
        /**
        self.version = @"1.0.0";
        self.uiVersion = @"1.0.0";
        self.nameModel = @"X01G001";
        */
        [self showHUDText:@"请先获取固件版本信息"];
        return;
    }
    
    switch (cell_id_num.intValue) {
        case 58://网络：表盘列表
        {
            NSString *model = @"X01M01T001";
            NSString *lang = @"zh_CN";
            [STNetManager.shared getCategoryDialsListWithModel:model lang:lang succeed:^(NSDictionary * _Nonnull dataDict, NSInteger respCode) {
                [self addLog:[NSString stringWithFormat:@"%@",dataDict]];
            } failed:^(NSError * _Nonnull error) {
            }];
        }
            break;
        case 59://网络：固件版本信息
        {
            [STNetManager.shared getFirmwareInfoWithModel:self.nameModel version:self.version factory:YES succeed:^(NSDictionary * _Nonnull dataDict, NSInteger respCode) {
                [self addLog:[NSString stringWithFormat:@"%@",dataDict]];
                ///NSString *urlStr = dataDict[@"bin_url"];
                ///[self requestDownloadWithUrlstring:urlStr];
            } failed:^(NSError * _Nonnull error) {
            }];
        }
            break;
        case 60://网络：UI版本信息
        {
            [STNetManager.shared getUisInfoWithModel:self.nameModel version:self.uiVersion factory:YES succeed:^(NSDictionary * _Nonnull dataDict, NSInteger respCode) {
                [self addLog:[NSString stringWithFormat:@"%@",dataDict]];
            } failed:^(NSError * _Nonnull error) {
            }];
        }
            break;
        case 61://网络：字库列表
        {
            NSString *lang = @"zh_CN";
            [STNetManager.shared getLangListWithModel:self.nameModel lang:lang succeed:^(NSDictionary * _Nonnull dataDict, NSInteger respCode) {
                [self addLog:[NSString stringWithFormat:@"%@",dataDict]];
            } failed:^(NSError * _Nonnull error) {
            }];
            NSString *version = @"1.0.0";
            [STNetManager.shared getLangInfoWithModel:self.nameModel version:version lang:lang succeed:^(NSDictionary * _Nonnull dataDict, NSInteger respCode) {
                [self addLog:[NSString stringWithFormat:@"%@",dataDict]];
            } failed:^(NSError * _Nonnull error) {
            }];
        }
            break;
            
        default:
            break;
    }
    
}

#pragma mark - 写入bin文件数据
- (void)writeBinFileInfo:(nonnull NSData *)info
                    Data:(nonnull NSData *)data
       BlockReadInterval:(NSUInteger)blockReadInterval {

    CBPeripheral *peripheral = STBleManager.sharedInstance.actDeviceModel.peripheral;
    CBCharacteristic *characteristic = STBleManager.sharedInstance.writeCharacter;
    
    [STBlueToothData.sharedInstance writeBinFileInfo:info
                                                Data:data
                                   BlockReadInterval:blockReadInterval
                                          Peripheral:peripheral
                                      Characteristic:characteristic
                                            Progress:^(PROGRESS_TYPE type, float progress) {
        if(progress >= 1){ ///倒计时结束
            [self showHUDText:@"传输完成"];
        }else{
            [self showProgress:progress];
        }
    }];
}

#pragma mark - 差分升级
- (void)writeBinFileDiffData:(nonnull NSData *)data
           BlockReadInterval:(NSUInteger)blockReadInterval {
    
    CBPeripheral *peripheral = STBleManager.sharedInstance.actDeviceModel.peripheral;
    CBCharacteristic *characteristic = STBleManager.sharedInstance.writeCharacter;
    
    [STBlueToothData.sharedInstance writeBinFileDiffData:data
                                       BlockReadInterval:blockReadInterval
                                              Peripheral:peripheral
                                          Characteristic:characteristic
                                                Progress:^(PROGRESS_TYPE type, float progress) {
        if(progress >= 1){ ///倒计时结束
            [self showHUDText:@"传输完成"];
        }else{
            [self showProgress:progress];
        }
    }];
}

/**
#pragma mark - UIImage转RGB565
- (NSData *)getRGB656DataWith:(UIImage*)image {
    
    NSMutableData *tmpData = NSMutableData.alloc.init;
    
    [self getRGBDataFromImage:image withRGB:^(unsigned char r, unsigned char g, unsigned char b) {
        
        //RGB888转RGB565数组
        uint16_t B = (b >> 3) & 0x001F;
        uint16_t G = ((g >> 2) << 5) & 0x07E0;
        uint16_t R = ((r >> 3) << 11) & 0xF800;
        
        uint16_t RGB565pixel = (R | G | B);
        
        Byte pByte[2] = {};
        pByte[0] = (Byte)((RGB565pixel>>8) & 0xFF);
        pByte[1] = (Byte)(RGB565pixel & 0xFF);
        NSData *rgb565 = [STMath byteToData:pByte Len:2];
        
        [tmpData appendData:rgb565];
    }];
    
    return tmpData;
}

- (void)getRGBDataFromImage:(UIImage*)image withRGB:(void(^)(unsigned char r,unsigned char g,unsigned char b))completion {
    
    CGImageRef cgimage = [image CGImage];
    
    size_t width = CGImageGetWidth(cgimage); // 图片宽度 240
    
    size_t height = CGImageGetHeight(cgimage); // 图片高度 280
    
    unsigned char *data = calloc(width * height * 4, sizeof(unsigned char)); // 取图片首地址
    
    size_t bitsPerComponent = 8; // r g b a 每个component bits数目
    
    size_t bytesPerRow = width * 4; // 一张图片每行字节数目 (每个像素点包含r g b a 四个字节)
    
    CGColorSpaceRef space = CGColorSpaceCreateDeviceRGB(); // 创建rgb颜色空间
    
    CGContextRef context =
    
    CGBitmapContextCreate(data,
                          width,
                          height,
                          bitsPerComponent,
                          bytesPerRow,
                          space,
                          kCGImageAlphaPremultipliedLast | kCGBitmapByteOrder32Big // RGBA
                          );
    
    CGContextDrawImage(context, CGRectMake(0, 0, width, height), cgimage);
    
    //image转RGB888数组
    //for (size_t i = 0; i < height; i++) {
    
    int start = (int)height-1;
    for (int i = start; i >= 0; i--) {
        
        for (size_t j = 0; j < width; j++) {
            
            size_t pixelIndex = i * width * 4 + j * 4;
            
            completion(data[pixelIndex],data[pixelIndex + 1],data[pixelIndex + 2]);
        }
    }
}
*/

@end
