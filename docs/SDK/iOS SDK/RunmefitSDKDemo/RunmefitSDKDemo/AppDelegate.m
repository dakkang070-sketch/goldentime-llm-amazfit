//
//  AppDelegate.m
//  RunmefitSDKDemo
//
//  Created by 星迈 on 2021/11/19.
//

#import "AppDelegate.h"

#import "MainTableViewController.h"

@interface AppDelegate ()

@end

@implementation AppDelegate


- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    
    self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
    [self.window makeKeyAndVisible];
    
    MainTableViewController *vc = [[MainTableViewController alloc]init];
    UINavigationController *nav = [[UINavigationController alloc] initWithRootViewController:vc];
    self.window.rootViewController = nav;
    
    /**
     当前sdk版本号:301.1
     可以看到通过修改Project文件配置的CURRENT_PROJECT_VERSION会实时修改该c文件的实现
     */
    NSLog(@"RunmefitSDKVersionNumber=%f",RunmefitSDKVersionNumber);
    
    return YES;
}

+ (AppDelegate *)shareInstance {
    return (AppDelegate *)[UIApplication sharedApplication].delegate;
}

//MARK: 提示
- (void)alertShowTitle:(NSString *)title message:(NSString *)message {
    
    UIAlertController *alertController = [UIAlertController alertControllerWithTitle:title message:message preferredStyle:UIAlertControllerStyleAlert];
    [self.window.rootViewController presentViewController:alertController animated:YES completion:nil];
    
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 1.2f * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
        [alertController dismissViewControllerAnimated:YES completion:nil];
    });
}

@end
