// Flip_Text - Dynamic font outlines (opentype.js)
$fn=30;
text_height=50;

// Character polygon modules
module c_65(){polygon(points=[[21.850,14.800],[19.350,22.550],[19.288,22.780],[19.217,23.040],[19.137,23.331],[19.048,23.652],[18.949,24.004],[18.842,24.387],[18.725,24.800],[18.619,25.176],[18.514,25.555],[18.410,25.936],[18.306,26.319],[18.204,26.704],[18.102,27.092],[18.000,27.482],[17.900,27.875],[17.789,28.313],[17.684,28.728],[17.585,29.119],[17.492,29.487],[17.405,29.832],[17.324,30.153],[17.250,30.450],[17.250,30.450],[17.189,30.114],[17.121,29.764],[17.046,29.400],[16.964,29.021],[16.875,28.629],[16.779,28.221],[16.675,27.800],[16.568,27.373],[16.463,26.951],[16.358,26.533],[16.255,26.118],[16.152,25.708],[16.051,25.302],[15.950,24.900],[15.852,24.509],[15.758,24.137],[15.668,23.783],[15.583,23.447],[15.501,23.130],[15.423,22.831],[15.350,22.550],[15.350,22.550],[12.800,14.800],[21.850,14.800],[34.600,0.000],[26.350,0.000],[23.600,8.400],[11.000,8.400],[8.250,0.000],[0.000,0.000],[12.550,35.850],[21.950,35.850],[34.600,0.000]],paths=[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48],[57,56,55,54,53,52,51,50,49]]);}


// Special character modules
module special_char(n){
  if("heart"=="heart") heart2(n,1);
  else if("heart"=="heart1") heart2(n,1);
  else if("heart"=="heart2") heart2(n,2);
  else if("heart"=="diamond") diamond(n,1);
  else if("heart"=="frame") diamond(n,2);
  else heart2(n,1);
}

module heart2(size,t){
    difference(){
        union(){
            r=0.7;
            translate([0,-size*r])
            scale([0.9*r,1.15*r])
            rotate([0,0,45]){
                square(size);
                translate([size/2,size]) circle(size/2,$fn=$fn);
                translate([size,size/2]) circle(size/2,$fn=$fn);
            }
        }
        if(t==2){
          union(){
            r=0.48;
            translate([0,-size*r])
                scale([0.9*r,1.15*r])
                    rotate([0,0,45]){
                        square(size);
                        translate([size/2,size]) circle(size/2,$fn=$fn);
                        translate([size,size/2]) circle(size/2,$fn=$fn);
                    }
          }
        }
    }
}

module diamond(s,t){
    size=s/1.555;
    if(t==1){
        translate([0,-s/2.2])  {
            rotate([0,0,45])
                difference() {
                    square(size*1.2);
                    translate([size/4,size/4]) square(size/1.6);
                }
                translate([-size/2.3/2,0]) square([size/2.3,size/5]);
        }
    }
    else{
        translate([-size*1.5/2,-s/2.2])  {
            difference() {
                square(size*1.50);
                translate([size/4,size/4]) square(size);
            }
        }
    }
}

// Main model
if(len("AX")>0 && len("XB")>0){
    render(){ union(){
        // Base plate
        translate([32.5,0,2.5])
          cube([65,75,5], center=true);
        translate([0,0,2.5]) cylinder(h=5, d=75, center=true);
        translate([65,0,2.5]) cylinder(h=5, d=75, center=true);

        // Characters - flip text intersection
        for (i=[0:1]){
            translate([65*i,0,5]){
                intersection(){
                    rotate([90,0,-45]){
                        translate([0,0,-125]){
                            linear_extrude(250){
                                      if(i==0){c_65();}
      if(i==1){c_88();}
                            }
                        }
                    }
                    rotate([90,0,45]){
                        translate([0,0,-125]){
                            linear_extrude(250){
                                      if(i==0){c_88();}
      if(i==1){c_66();}
                            }
                        }
                    }
                }
            }
        }
    }}
}