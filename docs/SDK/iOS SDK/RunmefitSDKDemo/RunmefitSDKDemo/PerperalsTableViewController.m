//
//  PerperalsTableViewController.m
//  RunmefitSDKDemo
//
//  Created by 星迈 on 2021/11/22.
//

#import "PerperalsTableViewController.h"

#import "AppDelegate.h"

@interface PerperalsTableViewController ()<UITableViewDelegate,UITableViewDataSource,UISearchBarDelegate>

@property(nonatomic,strong) NSArray *deviceModels;

@property(nonatomic,strong) UISearchBar *searchbar;
@property(nonatomic,strong) NSArray *searchModels;
@property(nonatomic,assign) BOOL isSearch;

@end

@implementation PerperalsTableViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    self.title = TRLocalizedString(@"设备列表", nil);
    
    UIButton*button = [[UIButton alloc]initWithFrame:CGRectMake(0,0,44,44)];
    [button setTitle:TRLocalizedString(@"返回", nil) forState:UIControlStateNormal];
    [button setTitleColor:[UIColor blackColor] forState:UIControlStateNormal];
    [button addTarget:self action:@selector(backMain) forControlEvents:UIControlEventTouchUpInside];
    self.navigationItem.leftBarButtonItem = [[UIBarButtonItem alloc] initWithCustomView:button];
    
    self.deviceModels = STBleManager.sharedInstance.deviceModels;
    __weak typeof(self) weakSelf = self;
    [STBleManager.sharedInstance setUpdatePerpheral:^(NSArray<STDeviceModel *> * _Nonnull deviceModels) {
        
        weakSelf.deviceModels = [weakSelf sortedArrayWithModels:deviceModels];
        [weakSelf.tableView reloadData];
    }];

    [STBleManager.sharedInstance setUpdateConnect:^(BOOL connect) {
        
        [MBProgressHUD hideHUDForView:self.view animated:YES];
        
        if (connect == YES) {
            [self backMain];
            NSLog(@"%@",TRLocalizedString(@"连接成功", nil));
        }else{
            NSLog(@"%@",TRLocalizedString(@"连接失败", nil));
        }
    }];

    [self setTableHeaderSearchView];
}

//搜索框
- (void)setTableHeaderSearchView {
    UIButton*button = [[UIButton alloc]initWithFrame:CGRectMake(0,0,44,44)];
    [button setTitle:TRLocalizedString(@"取消", nil) forState:UIControlStateNormal];
    [button setTitleColor:[UIColor blackColor] forState:UIControlStateNormal];
    [button addTarget:self action:@selector(cancelSearch) forControlEvents:UIControlEventTouchUpInside];
    self.navigationItem.rightBarButtonItem = [[UIBarButtonItem alloc] initWithCustomView:button];
    
    UISearchBar *searchbar = [[UISearchBar alloc]initWithFrame:CGRectMake(0, 0, [[UIScreen mainScreen] bounds].size.width, 50)];
    searchbar.delegate = self;
    self.tableView.tableHeaderView = searchbar;
    self.searchbar = searchbar;
}

//遍历数组中的蓝牙模型（按信号强度排序）
- (NSArray *)sortedArrayWithModels:(NSArray *)deviceModels {
    NSMutableArray *resDeviceModels = [NSMutableArray arrayWithArray:[deviceModels sortedArrayUsingComparator:^NSComparisonResult(STDeviceModel *obj1, STDeviceModel *obj2) {
        return [obj2.rssi compare:obj1.rssi];
    }]];
    return resDeviceModels;
}

-(void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    [STBleManager.sharedInstance startScan];
}

-(void)viewWillDisappear:(BOOL)animated {
    [super viewWillDisappear:animated];
    [STBleManager.sharedInstance stopScan];
}

- (void)backMain {
    [self.navigationController popViewControllerAnimated:YES];
}

#pragma mark - Table view data source

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section {
    if (self.isSearch) {
        return self.searchModels.count;
    }else{
        return self.deviceModels.count;
    }
}

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {
    static NSString *reusedId = @"reuseIdentifier";
    UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:reusedId];
    if (!cell) {
        cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleSubtitle reuseIdentifier:reusedId];
    }
    STDeviceModel *deviceModel = self.deviceModels[indexPath.row];
    if (self.isSearch) {
        deviceModel = self.searchModels[indexPath.row];
    }
    
    cell.textLabel.text = deviceModel.name;
    cell.detailTextLabel.text = deviceModel.mac;
    
    UILabel*rightLabel = [[UILabel alloc]initWithFrame:CGRectMake(0,0,70,45)];
    cell.accessoryView = rightLabel;
    rightLabel.text = [NSString stringWithFormat:@"RSSI:%@",deviceModel.rssi];
    if (deviceModel.rssi.intValue == 0) {
        rightLabel.text = @"已连接";
    }
    
    return cell;
}

#pragma mark - Table view delegate

-(void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath{
    STDeviceModel *deviceModel = self.deviceModels[indexPath.row];
    if (self.isSearch) {
        //放弃做键盘第一响应者
        [self.searchbar resignFirstResponder];
        deviceModel = self.searchModels[indexPath.row];
    }
    [STBleManager.sharedInstance connectPerpheral:deviceModel];
    
    MBProgressHUD *hud = [MBProgressHUD showHUDAddedTo:self.view animated:YES];
    hud.bezelView.blurEffectStyle = UIBlurEffectStyleDark;
    hud.contentColor = UIColor.whiteColor;//设置颜色
    hud.label.text = TRLocalizedString(@"连接中...",nil);
}

#pragma mark - UISearchBarDelegate

//搜索框按取消键时
-(void)cancelSearch {
    self.isSearch = NO;
    self.searchbar.text = @"";
    [self.tableView reloadData];
    //放弃做键盘第一响应者
    [self.searchbar resignFirstResponder];
}

//搜索框中文本改变
-(void) searchBar:(UISearchBar *)searchBar textDidChange:(NSString *)searchText {
    //执行搜索
    [self filterBySubstring:searchText];
}

//点击开始搜索
-(void)searchBarSearchButtonClicked:(UISearchBar *)searchBar {
    [self filterBySubstring:searchBar.text];
    //放弃做键盘第一响应者
    [searchBar resignFirstResponder];
}

-(void)filterBySubstring:(NSString *)text {
    self.isSearch = YES;
    //通过定义搜索来过滤数组数据
    NSMutableArray *searchModels = NSMutableArray.new;
    for (STDeviceModel *obj in self.deviceModels) {
        if ([obj.name containsString:text]) {
            [searchModels addObject:obj];
        }
    }
    self.searchModels = searchModels;
    [self.tableView reloadData];
}

@end
